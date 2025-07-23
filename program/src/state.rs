use anchor_lang::prelude::*;

#[account]
pub struct SensorBuffer {
    pub readings: [Reading; 8],
    pub idx: u8,
    pub last_timestamp: i64,
}

impl SensorBuffer {
    pub const SIZE: usize = Reading::SIZE * 8 + 1 + 8;
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Copy, Clone)]
pub struct Reading {
    pub value: u16,
    pub timestamp: i64,
}

impl Reading {
    pub const SIZE: usize = 2 + 8;
}
