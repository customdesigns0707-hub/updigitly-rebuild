# DISABLED — this script used to silently overwrite Vercel's DATABASE_URL
# (Production + Preview) with whatever was in the local .env.local file. It
# caused at least one real production outage: a stale local .env.local got
# pushed up and clobbered a correct value already in Vercel, breaking the
# live enrollment flow until re-fixed by hand. Disabled 2026-07-15.
#
# If you genuinely need to push a local DATABASE_URL to Vercel, do it
# manually through the Vercel dashboard (Settings -> Environment Variables)
# so you can see exactly what value you're setting and where. Do not
# re-enable this script without adding a confirmation prompt that prints
# the masked value and requires the user to type "yes" before proceeding.

Write-Error "This script has been disabled. It silently overwrote Vercel's DATABASE_URL and caused a production outage. See the comment at the top of this file. Update the Vercel dashboard by hand instead."
exit 1
