var socket = io();

$('body').on('carried',(e)=>{
    socket.emit('carried', {count: 1})
    $('#counter').val(parseInt($('#counter').val()) + 1)
})
socket.on('quitGame',()=>{
    console.log("QUIT GAME!")
    Render.stop(render)
    Runner.stop(runner)
    $('#game-anchor').html("<span>A new instance of the game is now running and here can only be one instance of the game running.</span>")
})
socket.emit('newInstance', $('#instance').val())
socket.on('checkInstance',()=>{
    socket.emit('checkInstance',$('#instance').val())
})

const refreshPlayers = ()=>{
    console.log("Refreshing Players")
    socket.emit('refreshPlayers', (data)=>{
        console.log(data)
        $(".acct").each((i,child)=>{
            $(child).remove()
        })
        data.forEach((player)=>{
            let relation = "friend"
            if (player._id==userId) relation="user"
            $('#friends-title').after(`<span class="acct ${relation}" title="View ${player.name}" name="${player._id}" onclick="viewFriend(\'${player._id}\')">${player.name}<span style="float:right">${player.carried}</span></span>`)
        })
    })
}

socket.emit('getOrbs',(orbs)=>{
    loadOrbs(JSON.parse(orbs))
})

socket.on('orbKilled',(response)=>{
    if (response.owner==userId){
        bulmaToast.toast({
            message: `${response.name} is attacking you!`,
            type: 'is-warning',
            duration: 3000,
            position: 'bottom-right',
            opacity: .8,
        })
        $(`span[name=${response.attacker}]`).css("background-color","rgba(200,0,0,.4)")
        if(friend != null){
            killOrb(friend,response.orb)
        }else{
            deleteOrb(response.orb)
        }
    }
})
socket.on('orbSpawned',(response)=>{
    if (friendId != null && friendId==response.owner){
        let orb = null
        if(response.parent == null){
            orb = friend
        }else{
            for(let i = 0; i < friend.orbs.length; ++i){
                let testOrb = friend.orbs[i]
                if(testOrb._id==response.parent){
                    orb = testOrb
                    break
                }
            }
        }
        orb = spawnOrb(friend.position.x,friend.position.y,orb,silent=true,color="#FFF",unowned=true)
        orb._id = response.orb
    }
})
const buyOrb = ()=>{
    if(orbTokens>0){
        orbTokens-=1
        $("#orb-tokens").val(orbTokens)
        return true
    }else{
        bulmaToast.toast({
            message: `You need orb tokens to build an orb! You have ${orbTokens}`,
            type: 'is-info',
            duration: 3000,
            position: 'bottom-right',
            opacity: .8,
        })
        return false
    }
}
const buyMissle = ()=>{
    if(missles>0){
        missles -= 1
        $("#missle-tokens").val(missles)
        return true
    }else{
        bulmaToast.toast({
            message: `You need missles to attack an orb! You have ${missles}`,
            type: 'is-info',
            duration: 3000,
            position: 'bottom-right',
            opacity: .8,
        })
        return false
    }
}
$('body').on('spawnOrb',(e,orb)=>{
    let parent = null
    if (orb.root != null && orb.root != attractiveBody){
        parent = orb.root._id
    }
    socket.emit('spawnOrb', {'parent': parent, color: orb.render.fillStyle}, (_id)=>{
        orb._id = _id
    })
})
$('body').on('updateOrb',(e,orb)=>{
    socket.emit('updateOrb',{_id: orb._id, color: orb.render.fillStyle})
})
$('body').on('killOrb',(e,orb)=>{
    socket.emit('killOrb',orb._id,(e)=>{
        killOrb(attractiveBody,orb)
    })
})

const viewFriend = (_id)=>{
    if (_id==userId) return
    socket.emit("getFriend",_id,(orbs)=>{
        friendId = _id
        loadFriend(orbs)
    })
    refreshPlayers()
}

const syncSelf = ()=>{
    socket.emit("syncSelf",userId,(data,e)=>{
        $("#missle-tokens").val(data.missles)
        $("#orb-tokens").val(data.orb_tokens)
        $('#counter').val(data.carried)
        orbTokens=data.orb_tokens
        missles=data.missles
    })
}
const claim_flag = ()=>{
    flag_field = $("#claim-flag")
    $.get('/claim',{id: userId, flag: flag_field.val()},(flag,e)=>{
        color = "empty"
        msg = "empty"
        if (flag.success){
            color = "is-success"
            msg = flag.msg
            if(flag.type=="delay"){
                orbTokens += 1
                $("#orb-tokens").val(orbTokens)
                msg="You have successfully recieved 1 Orb Token!"
            }else if(flag.type=="parsing"){
                missles += 1
                $("#missle-tokens").val(missles)
                msg="You have successfully recieved 1 Missle!"
            }else if(flag.type=="iframe"){
                $('#counter').val(parseInt($('#counter').val()) + 10)
                msg="You have successfully recieved 10 Utils!"
            }else if(flag.type=="user_agent"){
                $('#counter').val(parseInt($('#counter').val()) + 10)
                msg="You have successfully recieved 10 Utils!"
            }else if(flag.type=="poly"){
                $('#counter').val(parseInt($('#counter').val()) + 500)
                msg="You have successfully recieved 500 Utils!"
            }
        }else{
            color ="is-danger"
            msg = flag.error
        }
        bulmaToast.toast({
            message: msg,
            type: color,
            duration: 3000,
            position: 'bottom-right',
            opacity: .8,
        })
        flag_field.val("")
    })
}
syncSelf()