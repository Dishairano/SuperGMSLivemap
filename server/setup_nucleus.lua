local shouldUseNucleus = GetConvar("livemap_use_nucleus", "true")
local url = "https://cfx.re/api/register/?v=2"

local function uuid()
    local template ='xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
    return string.gsub(template, '[xy]', function (c)
        local v = (c == 'x') and math.random(0, 0xf) or math.random(8, 0xb)
        return string.format('%x', v)
    end)
end

if shouldUseNucleus == "false" then
    return
end

local rawData = LoadResourceFile(GetCurrentResourceName(), "livemap_uuid")

if not rawData then
    rawData = uuid()
    SaveResourceFile(GetCurrentResourceName(), "livemap_uuid", rawData, -1)
end

local socketPort = GetConvar("socket_port", 30121)

local dataToPost = {
    ["token"] = "anonymous",
    ["tokenEx"] = string.format("%s_LiveMapResourcePloxNoBan", rawData),
    ["port"] = string.format("%d", socketPort)
}

PerformHttpRequest(url, function(returnCode, data, header)

    if returnCode ~= 200 then
        return
    end

    local parsedData = json.decode(data)
    local reverseProxy = {
        ["blips"] = string.format("https://%s/blips", parsedData["host"]),
        ["socket"] = string.format("wss://%s", parsedData["host"])
    }

end, "POST", json.encode(dataToPost), {["Content-Type"] = "application/json"})
