use anchor_lang::prelude::*;

#[error_code]
pub enum SensorStreamError {
    #[msg("Stale timestamp")]
    StaleTimestamp,
    #[msg("Invalid timestamp")]
    InvalidTimestamp,
    #[msg("Invalid sensor value")]
    InvalidValue,
    #[msg("Buffer overflow")]
    BufferOverflow,
}
