// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/**
 * @title MockUSDT
 * @dev Mock USDT contract for testing (6 decimals)
 */
contract MockUSDT is ERC20 {
    uint8 private constant _decimals = 6;

    constructor() ERC20("Mock USDT", "USDT") {
        _mint(msg.sender, 1000000000 * 10**decimals()); // 1 billion USDT
    }

    function decimals() public pure override returns (uint8) {
        return _decimals;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

