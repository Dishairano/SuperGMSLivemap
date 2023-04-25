const blipLog = require("simple-console-logger").getLogger("LiveMap Blips");
const fs = require("fs");
const path = require("path");

const BlipController = (SocketController) => {
    let playerWhoGeneratedBlips = null;
    let blips = null;
    const blipFile = GetConvar("blip_file", "server/blips.json");
    
    // Middleware to send the blips
    const getBlips = (ctx) => {
        if (blips === null){
            ctx.body = JSON.stringify({
                error: "blip cache is empty"
            });
        }else{
            ctx.body = JSON.stringify(blips);
        }
    };

    // function to save blips to blip file
    const saveBlips = () => {
        const saved = SaveResourceFile(GetCurrentResourceName(), blipFile, JSON.stringify(blips, null, 4), -1);

        if (saved) {
            blipLog.info("Saved blip file");
        } else {
            blipLog.warn("Error writing to blip file... Maybe permissions aren't correct?");
        }
    };
    // function to load blips from blip file
    const loadBlips = () => {
        const loaded = LoadResourceFile(GetCurrentResourceName(), blipFile);
        if (loaded) {
            try {
                blips = JSON.parse(loaded);
            } catch (err) {
                blipLog.warn("Error when parsing blips.json file. Please make sure it's valid JSON. %s", err.message);
            }
        } else {
            // Make an empty blip file?
            blips = {};
            saveBlips();
        }
    };

    const getDistanceBetween = (p1, p2) => {
        let x = Math.pow(p2.x - p1.x, 2);
        let y = Math.pow(p2.y - p1.y, 2);
        let z = Math.pow(p2.z - p1.z, 2);

        return Math.sqrt(x + y + z);
    };

    const getBlipIndex = (sprite, pos) => {
        if (blips[sprite] === undefined){
            return -1;
        }
        
        blips[sprite].forEach((blip, index) => {
            if (blip.pos == pos){
                return index;
            }
        });

        return -1;
    };

    const validBlip = (blip) => {
        if (blip["sprite"] === undefined || blip["sprite"] === null) {
            blipLog.debug("Blip didn't have sprite: %o", blip);
            blipLog.warn("Blip has no sprite...");
            return false;
        }
        
        if (blip["pos"] === undefined || blip["pos"] === null) {
            blipLog.debug("Blip didn't have pos: %o", blip);
            blipLog.warn("Blip has no position...");
            return false;
        }

        if (typeof(blip.pos) !== "object"){
            blipLog.warn("Blip position must be an object");
            return false;
        }

        if (blip.pos["x"] === undefined || blip.pos["y"] === undefined || blip.pos["z"] === undefined){
            blipLog.debug("Invalid position: %o", blip.pos);
            blipLog.warn("Blip position invalid");
            return false;
        }

        if (typeof(blip.pos.x) !== "number" || typeof(blip.pos.y) !== "number" || typeof(blip.pos.z) !== "number"){
            blipLog.warn("Blip pos must be numbers");
            blipLog.debug("Invalid position: %o", blip.pos);
            return false;
        }

        return true;
    };

    on("onResourceStart", (name) => {
        if (name === GetCurrentResourceName()){
            loadBlips();
        }
    });
    on("onResourceStop", (name) => {
        if (name === GetCurrentResourceName()){
            saveBlips();
        }
    });

    onNet("livemap:blipsGenerated", (blipTable) => {
        let playerIdentifier = GetPlayerIdentifier(source, 0);
        if (playerWhoGeneratedBlips === null || playerWhoGeneratedBlips !== playerIdentifier){
            blipLog.warn("playerWhoGeneratedBlips doesn't match... Not using the blips recieved");
            return;
        }

        blips = blipTable;
        saveBlips();
    });

    onNet("livemap:AddBlip", (blip) => {
        if (!validBlip(blip)){
            return;
        }

        //Extract the spite
        const sprite = blip.sprite.toString();
        delete blip.sprite;

        // Make sure it's to 2 dp
        blip.pos.x = blip.pos.x.toFixed(2);
        blip.pos.y = blip.pos.y.toFixed(2);
        blip.pos.z = blip.pos.z.toFixed(2);

        // Get the index of the blip.. Making sure it exists
        let blipIndex = getBlipIndex(sprite, blip);

        if (blipIndex !== -1){
            blipLog.debug("Duplicate blip: %d = %o", blipIndex, blip);
            blipLog.warn("Blip already exists... Cannot add it!");
            return;
        }

        if (blips[sprite] === undefined){
            blips[sprite] = [];
        }

        blips[sprite].push(blip);

        SocketController.AddBlip(sprite, blip);
    });

    onNet("livemap:UpdateBlip", (blip) => {
        if(!validBlip(blip)){
            return;
        }

        //Extract the spite
        const sprite = blip.sprite.toString();
        delete blip.sprite;

        // Make sure it's to 2 dp
        blip.pos.x = blip.pos.x.toFixed(2);
        blip.pos.y = blip.pos.y.toFixed(2);
        blip.pos.z = blip.pos.z.toFixed(2);

        // Get the index of the blip.. Making sure it exists
        let blipIndex = getBlipIndex(sprite, blip);

        if (blipIndex !== -1){
            blips[sprite][blipIndex] = blip;
            SocketController.UpdateBlip(sprite, blip);
        }else{
            if (blips[sprite] === undefined){
                blips[sprite] = [];
            }
            
            blips[sprite].push(blip);
            SocketController.AddBlip(sprite, blip);
        }
    });

    onNet("livemap:RemoveBlip", (blip) => {
        if (!validBlip(blip)){
            return;
        }

        //Extract the spire
        const sprite = blip.sprite.toString();
        delete blip.sprite;

        // Make sure it's to 2 dp
        blip.pos.x = blip.pos.x.toFixed(2);
        blip.pos.y = blip.pos.y.toFixed(2);
        blip.pos.z = blip.pos.z.toFixed(2);

        // Get the index of the blip.. Making sure it exists
        let blipIndex = getBlipIndex(sprite, blip);
        if (blipIndex !== -1) {
            delete blips[sprite][blipIndex];
            blipLog.info("Removed blip: %o", blip);
            SocketController.RemoveBlip(sprite, blip);
        }else{
            blipLog.warn("Cannot delete a blip that doesn't exist");
        }
    });

    onNet("livemap:RemoveClosestBlip", (playerPos) => {
        let closest, sprite, currentBest;
        for (let spriteId in blips){
            blips[spriteId].forEach(blip => {
                let myDistance = getDistanceBetween(playerPos, blip.pos);
                if (currentBest === undefined || myDistance < currentBest){
                    currentBest = myDistance;
                    closest = blip;
                    sprite = spriteId;
                }
            });
        }

        if (currentBest === undefined) { // Possibly no blips..
            return;
        }

        blipLog.info("Removing closest blip. It's sprite is %d and position (dis=%d) is %o", sprite, closest.pos);

        const blipToDelete = getBlipIndex(sprite, closest.pos);
        if (blipToDelete == -1){
            blipLog.debug("Closest blip doesn't exist? %o\n%O", closest, blips);
            return;
        }

        delete blips[sprite][blipToDelete];
        SocketController.RemoveBlip(sprite, closest);
    });

    RegisterCommand("blips", (src, args) => {
        if (src === 0) {
            blipLog.warn("Please run this command in game. Make sure you have ACE permissions set up");
            return;
        }

        let playerIdentifier = GetPlayerIdentifier(src, 0);
        if (args[0] === "generate") {
            playerWhoGeneratedBlips = playerIdentifier;
            blipLog.warn("Generating blips using the in-game natives: Player %s is generating them.", playerIdentifier);
            emitNet("livemap:getBlipsFromClient", src);
        }
    }, true);
    
    return {
        getBlips
    };
};


module.exports = BlipController;
