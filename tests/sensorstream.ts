import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { assert } from "chai";

describe("sensorstream", () => {
  const provider = anchor.AnchorProvider.local();
  anchor.setProvider(provider);

  const program = anchor.workspace.Sensorstream;
  const bot = anchor.web3.Keypair.generate();
  const bot2 = anchor.web3.Keypair.generate();
  let bufferPda;
  let buffer2Pda;

  before(async () => {
    [bufferPda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sensor"), bot.publicKey.toBuffer()],
      program.programId
    );
    [buffer2Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sensor"), bot2.publicKey.toBuffer()],
      program.programId
    );

    await provider.connection.requestAirdrop(bot.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(bot2.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 1000));
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
    const firstTs = new anchor.BN(Math.floor(Date.now() / 1000) + 100);
    const secondTs = new anchor.BN(firstTs.toNumber() - 1);

    await program.methods
      .submitReading(1, firstTs)
      .accounts({
        bot: bot.publicKey,
        buffer: bufferPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bot])
      .rpc();

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
      assert.include(err.toString(), "StaleTimestamp");
    }
  });

  it("rejects negative timestamp", async () => {
    const bot3 = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(bot3.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 500));

    const [buffer3Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sensor"), bot3.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .submitReading(100, new anchor.BN(-1))
        .accounts({
          bot: bot3.publicKey,
          buffer: buffer3Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bot3])
        .rpc();
      assert.fail("Negative timestamp should have failed");
    } catch (err) {
      assert.include(err.toString(), "InvalidTimestamp");
    }
  });

  it("rejects zero timestamp", async () => {
    const bot4 = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(bot4.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 500));

    const [buffer4Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sensor"), bot4.publicKey.toBuffer()],
      program.programId
    );

    try {
      await program.methods
        .submitReading(100, new anchor.BN(0))
        .accounts({
          bot: bot4.publicKey,
          buffer: buffer4Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bot4])
        .rpc();
      assert.fail("Zero timestamp should have failed");
    } catch (err) {
      assert.include(err.toString(), "InvalidTimestamp");
    }
  });

  it("rejects timestamp near i64::MAX", async () => {
    const maxTimestamp = new anchor.BN("9223372036854689407");

    try {
      await program.methods
        .submitReading(999, maxTimestamp)
        .accounts({
          bot: bot.publicKey,
          buffer: bufferPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bot])
        .rpc();
      assert.fail("Should reject timestamp near i64::MAX");
    } catch (err) {
      assert.include(err.toString(), "InvalidTimestamp");
    }
  });

  it("rejects value over 10000", async () => {
    const ts = new anchor.BN(Math.floor(Date.now() / 1000) + 200);

    try {
      await program.methods
        .submitReading(10001, ts)
        .accounts({
          bot: bot.publicKey,
          buffer: bufferPda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bot])
        .rpc();
      assert.fail("Should reject value > 10000");
    } catch (err) {
      assert.include(err.toString(), "InvalidValue");
    }
  });

  it("accepts maximum valid value", async () => {
    const ts = new anchor.BN(Math.floor(Date.now() / 1000) + 300);

    await program.methods
      .submitReading(10000, ts)
      .accounts({
        bot: bot.publicKey,
        buffer: bufferPda,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([bot])
      .rpc();
  });

  it("handles buffer wraparound safely", async () => {
    const bot5 = anchor.web3.Keypair.generate();
    await provider.connection.requestAirdrop(bot5.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 500));

    const [buffer5Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sensor"), bot5.publicKey.toBuffer()],
      program.programId
    );

    let baseTs = Math.floor(Date.now() / 1000) + 1000;

    for (let i = 0; i < 20; i++) {
      await program.methods
        .submitReading(i, new anchor.BN(baseTs + i))
        .accounts({
          bot: bot5.publicKey,
          buffer: buffer5Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bot5])
        .rpc();
    }
  });

  it("concurrent submissions to different bots", async () => {
    const bot6 = anchor.web3.Keypair.generate();
    const bot7 = anchor.web3.Keypair.generate();
    
    await provider.connection.requestAirdrop(bot6.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await provider.connection.requestAirdrop(bot7.publicKey, 10 * anchor.web3.LAMPORTS_PER_SOL);
    await new Promise(resolve => setTimeout(resolve, 1000));

    const [buffer6Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sensor"), bot6.publicKey.toBuffer()],
      program.programId
    );
    const [buffer7Pda] = anchor.web3.PublicKey.findProgramAddressSync(
      [Buffer.from("sensor"), bot7.publicKey.toBuffer()],
      program.programId
    );

    const baseTs = Math.floor(Date.now() / 1000) + 5000;

    const promises = [
      program.methods
        .submitReading(111, new anchor.BN(baseTs))
        .accounts({
          bot: bot6.publicKey,
          buffer: buffer6Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bot6])
        .rpc(),
      
      program.methods
        .submitReading(222, new anchor.BN(baseTs))
        .accounts({
          bot: bot7.publicKey,
          buffer: buffer7Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bot7])
        .rpc()
    ];

    await Promise.all(promises);
  });

  it("bot cannot write to another bot PDA", async () => {
    const ts = new anchor.BN(Math.floor(Date.now() / 1000) + 6000);

    try {
      await program.methods
        .submitReading(999, ts)
        .accounts({
          bot: bot.publicKey,
          buffer: buffer2Pda,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .signers([bot])
        .rpc();
      assert.fail("Should not allow cross-bot PDA access");
    } catch (err) {
      assert.include(err.toString().toLowerCase(), "seed");
    }
  });
});