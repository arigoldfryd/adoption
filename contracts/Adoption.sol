// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Adoption {

    /************************ PROPERTIES ************************/

    struct PetOwner {
        address owner;
        bool awardClaimed;
    }

    // @notice Save pets name as key with owner address as value.
    mapping(string => PetOwner) private petsWithOwner;

    // @notice Available pets to be adopted.
    string[] private pets;

    uint256 private constant AWARD = 0.01 ether;

    /************************ METHODS ************************/

    function sendPetToBeAdopted(string memory petName) external {
        require(petsWithOwner[petName].owner == address(0), "A pet with this name is already exists.");
        
        petsWithOwner[petName] = PetOwner(msg.sender, false);
        pets.push(petName);
    }

    function adoptAPet(string memory petName) external {
        PetOwner storage petOwner = petsWithOwner[petName];

        require(petOwner.owner != address(0), "The pet isn't available to be adopted.");
        require(petOwner.owner != msg.sender, "You already are the owner of this pet.");

        petOwner.owner = msg.sender;
        petOwner.awardClaimed = false;
    }

    function getPetOwner(string memory petName) external view returns(address) {
        return petsWithOwner[petName].owner;
    }

    function getPetOwners() external view returns(string[] memory, address[] memory _owners) {
        _owners = new address[](pets.length);

        for(uint i = 0; i < pets.length; i++) {
            _owners[i] = petsWithOwner[pets[i]].owner;
        }

        return (pets, _owners);
    }

    function donate() payable external { }

    function claimAward() external {
        uint256 counter = 0;
        
        for(uint i = 0; i < pets.length; i++) {
            if (petsWithOwner[pets[i]].owner == msg.sender && !petsWithOwner[pets[i]].awardClaimed) {
                petsWithOwner[pets[i]].awardClaimed = true;
                counter++;
            }
        }

        require(counter > 0, "You need to adopt a pet before.");
        
        uint256 amount = AWARD * counter;
        require(address(this).balance > amount, "There are not enough donations for your award.");
        payable(msg.sender).transfer(amount);
    }
}
