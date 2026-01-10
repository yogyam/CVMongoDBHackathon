import { CdpClient } from "@coinbase/cdp-sdk";
import dotenv from "dotenv";

dotenv.config();

async function createEvmAccount() {
  const cdp = new CdpClient();
  const account = await cdp.evm.createAccount();
  console.log(`Created EVM account: ${account.address}`);
  return account;
}

export default createEvmAccount;

createEvmAccount().catch((error) => {
  console.error("Error creating EVM account:", error);
});