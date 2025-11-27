// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/**
 * @dev Required interface of an ERC1155 compliant contract, as defined in the
 * https://eips.ethereum.org/EIPS/eip-1155[EIP].
 */
interface IERC1155Extensible is IERC1155 {
    function mint(address to, uint256 tokenId, uint256 value) external;

    function mintBatch(
        address to,
        uint256[] calldata tokenIds,
        uint256[] calldata values
    ) external;

    function burn(address from, uint256 tokenId, uint256 value) external;

    function burnBatch(
        address from,
        uint256[] calldata tokenIds,
        uint256[] calldata values
    ) external;
}
