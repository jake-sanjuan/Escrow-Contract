const { assert } = require("chai");
const VALUE = ethers.utils.parseEther('1');

describe('Escrow', () => {

  let initiatorSigner,
    initiatorAddress,
    otherPartySigner,
    otherPartyAddress,
    escrow,
    deployTx,
    deployReceipt;

  before(async () =>{

    const Escrow = await ethers.getContractFactory('Escrow');
    escrow = await Escrow.deploy();
    await escrow.deployed();

    tx = escrow.deployTransaction
    receipt = await tx.wait();

    initiatorSigner = ethers.provider.getSigner(0);
    initiatorAddress = await initiatorSigner.getAddress();

    otherPartySigner = ethers.provider.getSigner(1);
    otherPartyAddress = await otherPartySigner.getAddress();

  });

  describe('upon deployment', () =>{
    before(async () => {

    });

    it('should set EscrowStage to ValueSetting (0)', async() => {
      assert.equal(await escrow.currentStage(), 0);
    });

    it('should set the initiator to the contract creator', async () => {
      assert.equal(initiatorAddress.toString(), await escrow.initiator());
    });

    //it('should emit the event', async () =>{
    //  const eventEmitted = receipt.events.find(x => x.event === 'Deployed');
      //assert(eventEmitted, 'Event not found.');
    //});

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
    before(async() => {
      const tx = await escrow.setValue(VALUE);
      receipt = await tx.wait();
    });

    it('should set a value equal to 1 ether', async () => {
      const value = await escrow.value()
      assert.equal(value.toString(), ethers.utils.parseEther('1'));
    });

    it('should emit an event', () => {
      const event = receipt.events.find(x => x.event === "ValueChange");
      assert(event, "No event emitted!");

      // FIGURE OUT ARGS VS TOPICS VS DATA IN LOGS, ETHERS DOCS CONFUSED
      describe('with arguments', () =>{
        it('should have a new value of 1', () => {
          assert.equal(event.args[0].toString(), ethers.utils.parseEther('1'));
        });

        it('should have an old value of 0', () => {
          // Do this
        });
      });
    });

    it('should set EscrowStage to AddingAnotherParty (1)', async () =>{
      assert(await escrow.currentStage(), 1);
    });

    it('should not allow value to be passed in', async () => {
      let ex;
      try {
        await contract.sendTransaction( {value: VALUE * 2} );
      } catch (_ex) {
        ex = _ex;
      }
      assert(ex, "Should revert");
    });
  });









});
