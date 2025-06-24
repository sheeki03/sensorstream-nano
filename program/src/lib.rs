use anchor_lang::prelude::*;

pub mod state;
pub mod error;

use state::*;
use error::SensorStreamError;

declare_id!("sensorstream111111111111111111111111111111111");

#[program]
pub mod sensorstream {
    use super::*;

    pub fn submit_reading(
        ctx: Context<SubmitReading>,
        value: u16,
        timestamp: i64,
    ) -> Result<()> {
        let buffer = &mut ctx.accounts.buffer;

        // TODO: Replay protection: Reject if timestamp <= last stored timestamp
        // Hint: Use buffer.idx to locate the last written reading in the circular buffer
        // If stale, return Err(SensorStreamError::StaleTimestamp.into());

        // Write reading into circular buffer
        let idx = buffer.idx as usize;
        buffer.readings[idx] = Reading { value, timestamp };
        buffer.idx = (buffer.idx + 1) % buffer.readings.len() as u8;

        // Emit event
        emit!(ReadingSubmitted {
            bot: ctx.accounts.bot.key(),
            value,
            timestamp,
        });

        Ok(())
    }
}

#[derive(Accounts)]
pub struct SubmitReading<'info> {
    #[account(mut, signer)]
    pub bot: Signer<'info>,
    #[account(
        mut,
        seeds = [b"sensor", bot.key().as_ref()],
        bump,
        payer = bot,
        space = 8 + SensorBuffer::SIZE
    )]
    pub buffer: Account<'info, SensorBuffer>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct ReadingSubmitted {
    pub bot: Pubkey,
    pub value: u16,
    pub timestamp: i64,
}
