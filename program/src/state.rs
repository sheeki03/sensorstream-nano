use anchor_lang::prelude::*;

#[account(zero_copy)]
#[repr(packed)]
pub struct SensorBuffer {
    pub readings: [Reading; 8],
    pub idx: u8,
}

impl SensorBuffer {
    pub const SIZE: usize = Reading::SIZE * 8 + 1;
}

#[derive(AnchorSerialize, AnchorDeserialize, Default, Copy, Clone)]
pub struct Reading {
    pub value: u16,
    pub timestamp: i64,
}

impl Reading {
    pub const SIZE: usize = 2 + 8; // u16 + i64
}
