//Create a Pixi Application
const app = new PIXI.Application({
    width: 800,
    height: 400,
    backgroundColor: 0xFFFFFF,
});

const tan = 0xEFF4E4
const brown = 0xACA46F
const purple = 0x7574A7
const blue = 0x5659C9
const g_TICK = 40; // 1000/40 = 25 frames per second
var g_Time = 0;

//Add the canvas that Pixi automatically created for you to the HTML document
document.getElementById('anchor').appendChild(app.view);

var circle = new PIXI.Graphics();
circle.beginFill(purple);
circle.drawCircle(100,100,50)
circle.endFill();
app.stage.addChild(circle);

var stage = new PIXI.Graphics()
stage.beginFill(tan)
stage.drawRect(200,200,200,200)
stage.endFill()
app.stage.addChild(stage);

circle.interactive = true
circle.button = true
circle.on('pointerdown', (event) => {
    circle.x -= 20*circle.scale.x/2
    circle.scale.x *= 1.1    
})

let elapsed = 0.0;


circle.root = circle
circle.nodes = []

app.stage.interactive = true
const new_node = (parent,event)=>{
    var newCircle = new PIXI.Graphics()
    newCircle.beginFill(purple);
    console.log(parent)
    newCircle.drawCircle(event.data.global.x,event.data.global.y,50)
    newCircle.endFill();
    app.stage.addChild(newCircle)
    newCircle.root = parent
    parent.children.push(newCircle)
    newCircle.nodes = []
    console.log(parent)
    newCircle.on('pointerdown',(event)=>{
        new_node(newCircle,event)
    })
}
const repell = (parent,obj)=>{
    let distance = (obj.x - parent.x)
}
circle.on('pointerdown',(event)=>{
    new_node(circle,event)
})
app.ticker.add((delta) => {
    
    // Add the time to our total elapsed time
    elapsed += delta;
    // Update the sprite's X position based on the cosine of our elapsed time.  We divide
    // by 50 to slow the animation down a bit...
    circle.x += 1
});

