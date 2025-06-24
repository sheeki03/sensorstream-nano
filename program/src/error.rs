use anchor_lang::prelude::*;

#[error_code]
pub enum SensorStreamError {
    #[msg("Timestamp must be greater than the last stored timestamp")]
    StaleTimestamp,
}
