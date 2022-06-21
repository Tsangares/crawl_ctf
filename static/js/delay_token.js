var socket = io();

const gen = ()=>{
    console.log("EMITTED")
    socket.emit('send_token',(token)=>{
        ele.innerHTML=`<span id='data'>${token}</span>`
    })
    var ele = document.getElementById("container")
}
setTimeout(gen,2000*Math.random() + 1000)