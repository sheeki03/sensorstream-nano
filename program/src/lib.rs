use anchor_lang::prelude::*;

pub mod state;
pub mod error;

use state::*;
use error::SensorStreamError;

declare_id!("G4SF8VvsrnNaGuwsh8u1PzeGKCDsNdwg3eB68KqX593X");

#[program]
pub mod sensorstream {
    use super::*;

    pub fn submit_reading(
        ctx: Context<SubmitReading>,
        value: u16,
        timestamp: i64,
    ) -> Result<()> {
        let buffer = &mut ctx.accounts.buffer;

        require!(
            timestamp > buffer.last_timestamp,
            SensorStreamError::StaleTimestamp
        );

        let idx = buffer.idx as usize;
        buffer.readings[idx] = Reading { value, timestamp };
        buffer.idx = (buffer.idx + 1) % 8;
        buffer.last_timestamp = timestamp;

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
        bump
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
