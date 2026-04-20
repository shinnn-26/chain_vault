// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract FileStorage {

    struct File {
        string name;
        string hash;
        address uploader;
        uint timestamp;
    }

    File[] public files;

    function uploadFile(string memory _name, string memory _hash) public {
        files.push(File(_name, _hash, msg.sender, block.timestamp));
    }

    function getFiles() public view returns (File[] memory) {
        return files;
    }
}