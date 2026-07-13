use chrono::{Utc, NaiveDateTime};

pub fn now_utc() -> NaiveDateTime {
    Utc::now().naive_utc()
}
