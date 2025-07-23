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

        require!(timestamp > 0, SensorStreamError::InvalidTimestamp);
        require!(timestamp > buffer.last_timestamp, SensorStreamError::StaleTimestamp);
        require!(timestamp < i64::MAX - 86400, SensorStreamError::InvalidTimestamp);
        require!(value <= 10000, SensorStreamError::InvalidValue);

        let idx = (buffer.idx as usize) % 8;
        buffer.readings[idx] = Reading { value, timestamp };
        
        let new_idx = buffer.idx.checked_add(1)
            .ok_or(SensorStreamError::BufferOverflow)?
            % 8;
        buffer.idx = new_idx;
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
        init_if_needed,
        payer = bot,
        space = 8 + SensorBuffer::SIZE,
        seeds = [b"sensor", bot.key().as_ref()],
        bump,
        rent_exempt = enforce
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
