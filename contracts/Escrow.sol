//SPDX-License-Identifier: None
pragma solidity ^0.7.0;

contract Escrow {

  enum EscrowStage {
    ValueSetting,
    AddingOtherParty,
    Payment,
    Settlement,
    EscrowComplete
    }

  EscrowStage public currentStage;
  address payable public initiator;
  address payable public otherParty;
  uint public value;

  mapping (address => bool) public paid;
  mapping (address => bool) public signed;

  event Deployed(address indexed initiator);
  event Deposit(address indexed depositor, uint amount);
  event ValueChange(uint indexed newValue, uint oldValue);
  event OtherPartySet(address indexed otherParty);
  event Settled(
    address indexed initiator,
    address indexed otherParty,
    uint amount
    );


  modifier onlyInitiator {
    require(
      msg.sender == initiator,
      "Only contract intiator can call this"
      );
    _;
  }

  modifier onlyParties {
    require(
      msg.sender == initiator || msg.sender == otherParty,
      "Must be one of two participants."
      );
      _;
  }

  constructor() {
    initiator = msg.sender;
    currentStage = EscrowStage.ValueSetting;

    emit Deployed(msg.sender);
  }

  function setValue(uint _value) external onlyInitiator {
    require(
      currentStage == EscrowStage.ValueSetting,
      "Not allowed at this stage"
      );
    value = _value;
    currentStage = EscrowStage.AddingOtherParty;

    emit ValueChange(_value, value);
  }

  function setOtherParty(address payable _otherParty) external onlyInitiator {
    require(
      currentStage == EscrowStage.AddingOtherParty,
      "Not allowed at this stage"
      );
    otherParty = _otherParty;
    currentStage = EscrowStage.Payment;

    emit OtherPartySet(_otherParty);
  }

  receive() external payable onlyParties {
    require(
      currentStage == EscrowStage.Payment,
      "Not allowed at this time"
      );
    require(
      msg.value == value * 2,
      "Must be double value exactly"
      );

    paid[msg.sender] = true;

    if (paid[initiator] && paid[otherParty]) {
      currentStage = EscrowStage.Settlement;
    }

    emit Deposit(msg.sender, msg.value);
  }

  function settle() external onlyParties {
    require(
      currentStage == EscrowStage.Settlement,
      "Not allowed at this time"
      );
    signed[msg.sender] = true;

    require(
      signed[initiator] == true && signed[otherParty] == true,
      "Once both parties have called this function the transaction will settle"
      );

    initiator.transfer(value * 3);
    otherParty.transfer(value);

    currentStage = EscrowStage.EscrowComplete;

    emit Settled(initiator, otherParty, value);
  }
}
