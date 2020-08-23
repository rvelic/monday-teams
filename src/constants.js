import moment from 'moment'

export const NOW = moment()
export const NOW_UTC_HOURS_DIFF = NOW.utcOffset() / 60
export const NUM_OF_WEEKS = 2
export const START_DATE = moment().startOf('isoWeek')
export const END_DATE = START_DATE.clone().add(NUM_OF_WEEKS, 'w')
export const DAYS_PER_WEEK = 7
export const HOURS_PER_DAY = 24
export const HOURS_PER_WEEK = HOURS_PER_DAY * DAYS_PER_WEEK
export const NUM_OF_HOURS = NUM_OF_WEEKS * HOURS_PER_WEEK
export const NUM_OF_DAYS = NUM_OF_WEEKS * DAYS_PER_WEEK
export const MAX_HOUR_SPAN = 8
export const MIN_HOUR_SPAN = 4
export const MIN_ZOOM = 100
export const MAX_ZOOM = 2000