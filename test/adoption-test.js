const { ethers } = require("hardhat");
const { expect } = require("chai");

describe("Adoption", function () {
    let deployer, alice, bob;

    beforeEach(async function() {
        [deployer, alice, bob] = await ethers.getSigners();

        const AdoptionContract = await ethers.getContractFactory("Adoption", deployer);

        this.contract = await AdoptionContract.deploy();
    })

    describe("Adopt a pet", function () {
        it("Should be able to send pet", async function () {
            await this.contract.connect(alice).sendPetToBeAdopted("mickey")
            expect(await this.contract.getPetOwner("mickey")).to.eq(alice.address)
        })

        it("Should be able to adopt a pet if it's not the owner", async function () {
            await this.contract.connect(bob).sendPetToBeAdopted("goofy")
            await this.contract.connect(alice).adoptAPet("goofy")
            expect(await this.contract.getPetOwner("goofy")).to.eq(alice.address)
        })

        it("Should not be able to send the same pet twice", async function () {
            await this.contract.sendPetToBeAdopted("mickey")
            expect(this.contract.sendPetToBeAdopted("mickey")).to.be.revertedWith("A pet with this name is already exists.")
        })        

        it("Should not be able to adopt a pet that isn't available", async function () {
            expect(this.contract.adoptAPet("mike")).to.be.revertedWith("The pet isn't available to be adopted.");
        })

        it("Should not be able to adopt being the owner already", async function () {
            await this.contract.connect(alice).sendPetToBeAdopted("lucas")
            await this.contract.connect(bob).adoptAPet("lucas")
            expect(this.contract.connect(bob).adoptAPet("lucas")).to.be.revertedWith("You already are the owner of this pet.");
        })
    });

    describe("Ownership", function () {
        it("Should be able to get pets owner", async function () {
            await this.contract.connect(deployer).sendPetToBeAdopted("mikey")
            await this.contract.connect(alice).sendPetToBeAdopted("goofy")
            await this.contract.connect(bob).sendPetToBeAdopted("lucas")

            const result = await this.contract.getPetOwners()
            const {0: pets, 1: owners} = result

            const expectedPets = ["mikey", "goofy", "lucas"]
            const expectedOwners = [deployer.address, alice.address, bob.address]

            expect(pets).to.eql(expectedPets)
            expect(owners).to.eql(expectedOwners)
        })
    });

    describe("Claims", function () {
        it("Should be able to send a donation", async function () {            
            await this.contract.connect(alice).donate({ value: ethers.utils.parseEther("0.01") })

            const balance = await ethers.provider.getBalance(this.contract.address);
            const expectedBalance = ethers.utils.parseEther("0.01")

            expect(balance).to.eql(expectedBalance);
        })

        it("Should be able to claim award after adopt a pet", async function () {
            await this.contract.connect(alice).donate({ value: ethers.utils.parseEther("0.02") })
            
            await this.contract.connect(alice).sendPetToBeAdopted("goofy")
            await this.contract.connect(bob).adoptAPet("goofy")

            const bobBalance = await ethers.provider.getBalance(bob.address);

            const tx = await this.contract.connect(bob).claimAward()
            const receipt = await ethers.provider.getTransactionReceipt(tx.hash)
            const gasPrice = await ethers.provider.getGasPrice()

            const expectedBalance = BigInt(bobBalance) - BigInt(receipt.gasUsed * gasPrice) + BigInt(ethers.utils.parseEther("0.01"));

            expect(await ethers.provider.getBalance(bob.address)).to.be.eq(expectedBalance);
            expect(await ethers.provider.getTransactionCount(this.contract.address)).to.be.eq(1);
        })

        it("Should not be able to claim award if nobody donated", async function () {
            await this.contract.connect(alice).sendPetToBeAdopted("goofy")
            await this.contract.connect(bob).adoptAPet("goofy")

            expect(this.contract.connect(bob).claimAward()).to.be.revertedWith("There are not enough donations to your award.")
        })

        it("Should not be able to claim award if didn't adopt any pets", async function () {
            await this.contract.connect(alice).donate({ value: ethers.utils.parseEther("0.02") })
            await this.contract.connect(alice).sendPetToBeAdopted("lucas")
            expect(this.contract.connect(bob).claimAward()).to.be.revertedWith("You need to adopt a pet before.")
        })

        it("Should not be able to claim award if contract doesn't have enough balance", async function () {
            await this.contract.connect(alice).sendPetToBeAdopted("lucas")
            await this.contract.connect(bob).adoptAPet("lucas")
            
            expect(this.contract.connect(bob).claimAward()).to.be.revertedWith("There are not enough donations to your award.")
        })
    });
});