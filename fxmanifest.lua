fx_version "bodacious"
game "gta5"

author "SuperGMS"
description ""
version "1.0.0"

client_script "client/*.lua"
exports {
    "reverseWeaponHash", "reverseVehicleHash", "reverseStreetHash",
    "reverseZoneHash", "reverseAreaHash"
}

-- Don't remove. Blips_client is needed for the `blips generate` command to work.
client_script "client/blips_client.lua"

server_scripts {
    "server/update_check.lua",
    "server/setup_nucleus.lua",
    "dist/livemap.js"
}
