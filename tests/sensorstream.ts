import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";

describe("sensorstream", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sensorstream as Program<any>;

  const bot = anchor.web3.Keypair.generate();
  let bufferPda: anchor.web3.PublicKey;

  before(async () => {
    [bufferPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sensor"), bot.publicKey.toBuffer()],
      program.programId
    );
  });

  it("happy path submit", async () => {
    const value = 42;
    const ts = new anchor.BN(Math.floor(Date.now() / 1000));

    await program.methods
      .submitReading(value, ts)
      .accounts({
        bot: bot.publicKey,
        buffer: bufferPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bot])
      .rpc();
  });

  it("stale timestamp fails", async () => {
    const firstTs = new anchor.BN(Math.floor(Date.now() / 1000) + 2);
    const secondTs = new anchor.BN(firstTs.toNumber() - 1); // stale

    // first write
    await program.methods
      .submitReading(1, firstTs)
      .accounts({
        bot: bot.publicKey,
        buffer: bufferPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bot])
      .rpc();

    // second write should fail
    try {
      await program.methods
        .submitReading(2, secondTs)
        .accounts({
          bot: bot.publicKey,
          buffer: bufferPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bot])
        .rpc();
      assert.fail("Stale timestamp should have failed");
    } catch (err) {
      assert.ok("Expected error thrown");
    }
  });
});
