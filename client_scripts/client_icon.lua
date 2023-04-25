--[[
    This file is respoinsible for updating the player's icon.
    If they're dead, show the "dead" icon.
    If they're in a vehicle, show the vehicle icon etc, etc, etc.
]]
local currentIcon = 6
local temp = {}

function doIconUpdate()
    local ped = PlayerPedId()
    local newSprite = 6 -- Default to the player one

    if IsEntityDead(ped) then
        newSprite = 163 -- Using GtaOPassive since I don't have a "death" icon :(
    else
        if IsPedSittingInAnyVehicle(ped) then
            -- Change icon to vehicle
            -- our temp table should still have the latest vehicle
            local vehicle = GetVehiclePedIsIn(ped, false)
            local vehicleModel = GetEntityModel(vehicle)

            -- set the temp["vehicle"] table to the current vehicle entity
            temp["vehicle"] = vehicle

            if vehicleModel == GetHashKey("pol7") or vehicleModel == GetHashKey("pol10") then
                newSprite = 226
            else
                newSprite = 225 -- PersonalVehicleCar
            end
        end
    end

    if currentIcon ~= newSprite then
        currentIcon = newSprite
        TriggerServerEvent("livemap:UpdatePlayerData", "icon", newSprite)
    end
end



Citizen.CreateThread(function()
    TriggerServerEvent("livemap:UpdatePlayerData", "icon", 6)
    while true do
        Wait(10)

        if NetworkIsPlayerActive(PlayerId()) then
            doIconUpdate()
        end

    end
end)
