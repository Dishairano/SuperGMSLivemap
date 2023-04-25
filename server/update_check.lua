local url = "https://raw.githubusercontent.com/Dishairano/SuperGMSLivemap/master/version.json"
local version = "1.0.0"
local latest = true

local rawData = LoadResourceFile(GetCurrentResourceName(), "version.json")

if not rawData then
else
    rawData = json.decode(rawData)
    version = rawData["resource"]
end

function checkForUpdate()
    PerformHttpRequest(url, function(err, data, headers)
        local parsed = json.decode(data)

        if (parsed["resource"] ~= version) then
            latest = false -- Stop running the timeout
        end

        -- Every 30 minutes, do the check (print the message if it's not up to date)
        SetTimeout( 30 * (60*1000), checkForUpdate)

    end, "GET", "",  { ["Content-Type"] = 'application/json' })
end

checkForUpdate();
