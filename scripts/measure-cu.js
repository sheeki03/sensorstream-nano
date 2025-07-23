const anchor = require("@coral-xyz/anchor");
const { Connection, PublicKey, Transaction, SystemProgram } = require("@solana/web3.js");

async function measureComputeUnits() {
  const connection = new Connection("http://127.0.0.1:8899", "confirmed");
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);
  
  const program = anchor.workspace.Sensorstream;
  const bot = anchor.web3.Keypair.generate();
  
  const [bufferPda] = anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("sensor"), bot.publicKey.toBuffer()],
    program.programId
  );

  try {
    const airdropSignature = await provider.connection.requestAirdrop(bot.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.confirmTransaction(airdropSignature, "confirmed");
  } catch (error) {
    console.log("Airdrop failed:", error);
    return;
  }

  const tx = await program.methods
    .submitReading(100, new anchor.BN(Math.floor(Date.now() / 1000)))
    .accounts({
      bot: bot.publicKey,
      buffer: bufferPda,
      systemProgram: SystemProgram.programId,
    })
    .signers([bot])
    .transaction();

  const result = await connection.simulateTransaction(tx, [bot]);
  
  if (result.value.err) {
    console.log("Simulation error:", result.value.err);
    return;
  }

  const computeUnits = result.value.unitsConsumed;
  console.log(`Compute Units Consumed: ${computeUnits}`);
  
  if (computeUnits <= 120000) {
    console.log("PASSED: CU usage within 120k limit");
  } else {
    console.log("FAILED: CU usage exceeds 120k limit");
  }
  
  return computeUnits;
}

measureComputeUnits().catch(console.error);