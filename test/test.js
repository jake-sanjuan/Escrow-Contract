const { assert } = require("chai");
const VALUE = ethers.utils.parseEther('1');


describe('Escrow', () => {

  let initiatorSigner,
    initiatorAddress,
    otherPartySigner,
    otherPartyAddress,
    outsideSigner,
    escrow,
    deployTx,
    deployReceipt;

  before(async () =>{
    const Escrow = await ethers.getContractFactory('Escrow');
    escrow = await Escrow.deploy();
    await escrow.deployed();

    //tx = escrow.deployTransaction
    //receipt = await tx.wait();

    initiatorSigner = ethers.provider.getSigner(0);
    initiatorAddress = await initiatorSigner.getAddress();

    otherPartySigner = ethers.provider.getSigner(1);
    otherPartyAddress = await otherPartySigner.getAddress();

    outsideSigner = ethers.provider.getSigner(2);

  });

  describe('upon deployment', () =>{
    before(async () => {
      // TODO: WTF was supposed to go here?
    });

    it('should set EscrowStage to ValueSetting (0)', async() => {
      assert.equal(await escrow.currentStage(), 0);
    });

    it('should set the initiator to the contract creator', async () => {
      assert.equal(initiatorAddress.toString(), await escrow.initiator());
    });

    it('should emit the event', async () =>{
      const topic = escrow.interface.getEventTopic('Deployed');
      const tx = escrow.deployTransaction;
      const receipt = await tx.wait();
      const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
      const deployedEvent = escrow.interface.parseLog(log);

      assert.equal(deployedEvent.name, 'Deployed');
    });

    it('should not allow another party to be set', async () => {
      let ex;
      try {
        await escrow.setOtherParty(otherPartyAddress);
      } catch (_ex) {
        ex = _ex;
      }
      assert(ex, 'should not let other party be set at this stage.');
    });
  });

  describe('someone other than the initiator attempts to set a value', () => {
      it('should revert', async() => {
        let ex;
        try {
          await escrow.connect(otherPartySigner).setValue(VALUE);
        } catch (_ex) {
          ex = _ex;
        }
        assert(ex, "Only the intiator can call this contract");
      });
    });

  describe('a value is set', () => {
    let receipt;
    let event;
    before(async() => {
      const tx = await escrow.setValue(VALUE);
      receipt = await tx.wait();
    });

    it('should set a value equal to 1 ether', async () => {
      const value = await escrow.value()
      assert.equal(value.toString(), ethers.utils.parseEther('1'));
    });

    it('should emit an event', () => {
      event = receipt.events.find(x => x.event === "ValueChange");
      assert(event, "No event emitted!");
    });

    it('should have a new value of 1', () => {
      assert.equal(event.args.newValue.toString(), ethers.utils.parseEther('1'));
    });

    it('should have an old value of 0', () => {
      assert.equal(event.args.oldValue.toString(), '0');
    });

    it('should set EscrowStage to AddingAnotherParty (1)', async () =>{
      assert(await escrow.currentStage(), 1);
    });

    it('should not allow value to be passed in', async () => {
      let ex;
      try {
        await initiatorSigner.sendTransaction({
          to: escrow.address,
          value: ethers.utils.parseUnits((VALUE * 2).toString(), 'wei')
        });
      } catch (_ex) {
        ex = _ex;
      }
      assert(ex, "Should revert");
    });
  });

  describe('someone other than the initiator tries to set the second party', () => {
    it('should revert', async () =>{
      let ex;
      try {
        await escrow.connect(otherPartySigner).setOtherParty(initiatorAddress);
      } catch (_ex) {
        ex = _ex;
      }
      assert(ex, 'Transaction should have reverted!');
    });
  });

  describe('setting another party', () => {
    let receipt;
    let event;

    before(async() => {
      const tx = await escrow.setOtherParty(otherPartyAddress);
      receipt = await tx.wait();
    });

    it('should set the other party', async () => {
      let other = await escrow.otherParty();
      assert.equal(other.toString(), otherPartyAddress);
    });

    it('should emit an event', async () => {
      event = receipt.events.find(x => x.event === 'OtherPartySet');
      assert(event, "No event emitted!");
    });

    it('should have the other parties address in the event logs', () => {
      assert.equal(event.args.otherParty, otherPartyAddress);
    });

    it('should set the EscrowStage to Payment (2)', async () => {
      let stage = await escrow.currentStage();
      assert.equal(stage.toString(), '2');
    });
  });

  describe('someone other than the two parties tries to send value', () => {
    it('should revert', async () => {
      let ex;
      try {
        await outsideSigner.sendTransaction({
          to: escrow.address,
          value: ethers.utils.parseUnits((VALUE * 2).toString(), 'wei')
        });
      } catch (_ex) {
        ex = _ex;
      }
      assert(ex, "Transaction should have reverted!");
    });
  });

  describe('The parties try to send an amount other than the value * 2', () => {
    it('should revert when the initiator sends', async () => {
      let ex;
      try {
        await initiatorSigner.sendTransaction({
          to: escrow.address,
          value: (VALUE).toString()
        });
      } catch (_ex) {
        ex = _ex;
      }
      assert(ex, "Transaction should have reverted!");
    });

    it('should revert when the other party sends', async () => {
      let ex;
      try {
        await otherPartySigner.sendTransaction({
          to: escrow.address,
          value: (VALUE).toString()
        });
      } catch (_ex) {
        ex = _ex;
      }
      assert(ex, "Transaction should have reverted!");
    });
  });

  describe('the contract initiator sends value to the contract', () => {
    let receipt;
    let event;
    before(async () => {
      const tx = await initiatorSigner.sendTransaction({
        to: escrow.address,
        value: ethers.utils.parseUnits((VALUE * 2).toString(), 'wei')
      });
      receipt = await tx.wait();
    });

    it('should have a value of VALUE * 2', async () => {
      let value = await ethers.provider.getBalance(escrow.address);
      assert.equal(value.toString(), ethers.utils.parseUnits((VALUE * 2).toString(), 'wei'));
    });

    it('should set the intiators boolean to true in the "paid" mapping', async () => {
      let intiatorBool = await escrow.paid(initiatorAddress);
      assert(intiatorBool, "Should have been set to true");
    });

    it('should emit a Deposit event', async () => {
      const topic = escrow.interface.getEventTopic('Deposit');
      const log = receipt.logs.find(x => x.topics.indexOf(topic) >= 0);
      event = escrow.interface.parseLog(log);

      assert.equal(event.name, 'Deposit');
    });

    it('should have the contract initiator as the depositor arg', async () => {
      assert.equal(event.args.depositor, initiatorAddress);
    });

    it('should have 2 ether as the amount', async () => {
      assert.equal(
        event.args.amount.toString(),
        ethers.utils.parseUnits((VALUE * 2).toString(), 'wei')
      );
    });
  });

  // TODO: otherParty tests for receive function
});
