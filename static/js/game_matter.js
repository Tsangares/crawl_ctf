Matter.use('matter-wrap','matter-attractors')

var Engine = Matter.Engine,
    Render = Matter.Render,
    Runner = Matter.Runner,
    Composite = Matter.Composite,
    Composites = Matter.Composites,
    Common = Matter.Common,
    Constraint = Matter.Constraint,
    MouseConstraint = Matter.MouseConstraint,
    Mouse = Matter.Mouse,
    Bodies = Matter.Bodies,
    Body = Matter.Body,
    Query = Matter.Query,
    Events = Matter.Events,
    Vertices = Matter.Vertices

// create engine
var engine = Engine.create(),
    world = engine.world;

engine.gravity.scale=0

// create renderer
var render = Render.create({
    element: document.getElementById('game-anchor'),
    engine: engine,
    options: {
        width: 800,
        height: 500,
        showAngleIndicator: false,
        wireframes: false
    }
});

Render.run(render);

// create runner
var runner = Runner.create();
Runner.run(runner, engine);


const makeStar = (x=render.options.width / 2,y=render.options.height / 2,color = "star_blue01",unowned=false)=>{
  var star = Bodies.circle(x, y, 50,{
    isStatic: false,
    density: 1e10,
    inertia: 1e10,
    torque: 1e6,
    friction: 0,
    frictionAir: 0,
    render: {
      sprite: {
        texture: `/static/img/main_sequence/${color}.png`,
        yScale: 0.1,
        xScale: 0.1,
      }
    },
    plugin: {
      attractors: [
        function(bodyA, bodyB) {
          if (bodyB.immune != null){
            return {
              x: 0,
              y: 0
            }
          }
          return {
            x: (bodyA.position.x - bodyB.position.x) * -1e-6,
            y: (bodyA.position.y - bodyB.position.y) * -1e-6,
          };
        }
      ]
    },
  });
  star.unowned=unowned
  star.orbs = []
  star.star = star
  return star
}
let attractiveBody = makeStar()

Composite.add(world, attractiveBody);

const makeStarAnchor = (x,y,star)=>{
  let anchor = Constraint.create({
    bodyA: star,
    pointB: {x: x, y: y},
    damping: 1,
    stiffness: .05,
    length: 1,
    render: {
      strokeStyle: "#ccc2",
      type: "line",
      visible: false
    }
  })
  star.anchor = anchor
  return anchor
}
var star_anchor = makeStarAnchor(render.options.width/2,render.options.height/2,attractiveBody)
Composite.add(world, star_anchor);

// add mouse control
var mouse = Mouse.create(render.canvas)
var mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: {
            stiffness: 0.2,
            render: {
                visible: true,
                strokeStyle: "#ccc2",
                type: "line"
            }
        }
    });

Composite.add(world, mouseConstraint);

// keep the mouse in sync with rendering
render.mouse = mouse;

// fit the render viewport to the scene
Render.lookAt(render, {
    min: { x: 0, y: 0 },
    max: { x: 800, y: 500 }
});

let satellites = []


$("body").on('draglessClick',(e)=>{
    const bodies = Query.point(Composite.allBodies(world), mouse.position)
    bodies.forEach((body)=>{
      if (body.unowned){
        //Attack
        if(body.star != undefined && body.star != body && body.connected.length == 0){
            //Not a star
            if(!buyMissle()) return;
            $('body').trigger('killOrb',body)
        }
      }else{
        //Build
        if (!buyOrb())return
        let red = Math.floor(Math.random()*256)
        let blue = Math.floor(Math.random()*256)
        let green = Math.floor(Math.random()*256)
        body.render.fillStyle = `rgb(${red},${blue},${green})`
        let x = mouse.position.x
        let y = mouse.position.y
        spawnOrb(x,y,body)
      }
    })
})

const makeSeeker = (seekerBody,end,strength,damping)=>{
  Composite.add(world,seekerBody)
  let spring = Constraint.create({
    bodyA: seekerBody,
    bodyB: end,
    damping: damping,
    stiffness: strength,
    length: 0,
    render: {
      visible: false,
    }
  })
  Composite.add(world,spring)
  seekerBody.immune=true
  seekerBody.isSeeker = true
  seekerBody.end = end
  seekerBody.spring = spring
  return new Promise((resolve,reject)=>{
    seekerBody.resolve = resolve
    Events.on(engine,"collisionStart",(event)=>{
      for(let i = 0; i < event.pairs.length; ++i){
        let pair = event.pairs[i] 
        let A = pair.bodyA,
            B = pair.bodyB
        let seeker = null,
            other = null
        if(A.isSeeker && !A.expired){
          seeker = A
          other = B
        }else if(B.isSeeker && !B.expired){
          seeker = B
          other = A
        }
        if(seeker != null && other != null){
          if(seeker.end.id == other.id){
            Composite.remove(world, seeker.spring)
            Composite.remove(world, seeker)
            seeker.expired = true
            seeker.resolve(seeker.end)
          }
        }
      }
    })
  })
}

let partiles = []
let last = 0
Matter.Events.on(engine, 'beforeUpdate', (e)=>{
  if ( e.timestamp - last > 2000/satellites.length) {
    last = e.timestamp
    if(satellites.length > 1){
      let start = satellites[Math.floor(satellites.length*Math.random())]
      let end = satellites[Math.floor(satellites.length*Math.random())]
      if (end == start){
        return;
      }
      let carrier = Bodies.circle(start.position.x,start.position.y, 1,{
        density: 0.05,
        render: {
          fillStyle: '#EEEEFF',
        }
        
      })
      carrier.isCarrier=true
      makeSeeker(carrier,end,0.001,0.01).then((end)=>{
        $('body').trigger('carried')
      })
    }
  }
});

const spawnOrb = (x,y,parent,silent=false,color="#FFFFFF",unowned=false)=>{
  let child = Bodies.circle(x,y, 15,{
      density: 50,
      render: {
        fillStyle: color,
      },
      plugin: {
        attractors: [
          function(bodyA, bodyB) {
            if (bodyB.immune != null){
              return {
                x: 0,
                y: 0
              }
            }
            return {
              x: (bodyA.position.x - bodyB.position.x) * -1e-6,
              y: (bodyA.position.y - bodyB.position.y) * -1e-6,
            };
          }
        ]
      },
  })
  let length = 100
  if (parent==attractiveBody){
    length = 100
  }
  let spring = Constraint.create({
      bodyA: child,
      bodyB: parent,
      damping: .01,
      stiffness: .001,
      length: length,
      render: {
        strokeStyle: "#ccc2",
        type: "line"
      }
  })
  Composite.add(world, [child,spring])
  if (parent.connected==null){
    parent.connected = [child]
  }else{
    parent.connected.push(child)
  }
  child.connected = []
  child.root = parent
  child.star = parent.star
  child.star.orbs.push(child)
  child.unowned = unowned
  child.anchor = spring
  if (!unowned){
    satellites.push(child)
  }
  if (!silent){
    $('body').trigger('spawnOrb',child)
    $('body').trigger('updateOrb',parent)
  }
  return child
}
//Recursive function to build orb tree
function makeOrb (orb,parent,unowned=false){
  let x = parent.position.x
  let y = parent.position.y
  var body = spawnOrb(x,y,parent,silent=true,color=orb.color,unowned=unowned)
  body._id = orb._id
  orb.children.forEach((child)=>{
    setTimeout(()=>{makeOrb(child,body,unowned)},1000*Math.random())
  })
}
const loadOrbs=(orbs,start=attractiveBody,unowned=false)=>{
  orbs.forEach((orb)=>{
    makeOrb(orb,start,unowned)
  })
}

var friendId = null
var friend = null
const loadFriend=(orbs)=>{
  let timeout = 0
  if (friend != null){
    friend.anchor.pointB = {x: render.options.width*1.5, y: friend.anchor.pointB.y}
    timeout=500
  }
  setTimeout(()=>{
    destroyFriend()
    let point = {x: render.options.width / 4, y: render.options.height / 2,}
    star_anchor.pointB = point
    let star = makeStar(
      x=render.options.width+100,
      y=render.options.height / 2,
      color='star_orange01',
      unowned=true
      )
    Composite.add(world, star)
    let anchor = makeStarAnchor(3*render.options.width / 4,render.options.height / 2, star)
    Composite.add(world, anchor)
    loadOrbs(orbs,star,unowned=true)
    friend = star
  },timeout)
}

const destroyFriend=()=>{
  if (friend != null){
    friend.orbs.forEach((orb)=>{
      Composite.remove(world, orb)
      Composite.remove(world, orb.anchor)
    })
    Composite.remove(world, friend.anchor)
    Composite.remove(world, friend)
  }
}
const killOrb=(attacker,orb)=>{
  if(typeof orb == "string" || orb instanceof String){
    satellites.forEach((body)=>{
      if(body._id==orb) orb = body
    })
  }
  let missle = Bodies.polygon(attacker.position.x,attacker.position.y, 3,10,{
    density: 0.05,
    render: {
      fillStyle: '#F00',
    }
  })
  makeSeeker(missle,orb,0.001,0.05).then((target)=>{
    console.log('Target',target)
    deleteOrb(target)
  })
}

const splatter = (orb)=>{
  let pos = orb.position
  objects = []
  for(let i = 0; i < Math.floor(Math.random()*5+5); ++i){
    let exp = Bodies.circle(pos.x, pos.y, 3,{
      density: 10,
      inertia: 1,
      torque: 0,
      force: {x: 6*Math.random()-3, y: 6*Math.random()-3}
    })
    objects.push(exp)
  }
  orb.particles = objects
  Composite.add(world,objects)
  setTimeout(()=>{
    Composite.remove(world,orb.particles)
  },500)
}
function deleteOrb (orb){
  if(typeof orb == "string" || orb instanceof String){
    satellites.forEach((body)=>{
      if(body._id==orb) orb = body
    })
  }
  splatter(orb)
  Composite.remove(world, orb.anchor)
  Composite.remove(world, orb)
  let index = satellites.indexOf(orb)
  if (index != -1){
    satellites.splice(index,1)
  }
  orb.star.orbs.splice(orb.star.orbs.indexOf(orb),1)
  orb.root.connected.splice(orb.root.connected.indexOf(orb),1)
  return "success"
}


