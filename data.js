/* ===== EDIT ME: placeholder data. Later, swap for fetch() calls to your Express API. ===== */
/* Express server address: localhost while developing, your deployed server (Render/Railway) once live */
const API_BASE = ['localhost', '127.0.0.1', ''].includes(location.hostname) ? 'http://localhost:3000' : 'https://deadlck-track.onrender.com';
const NAV = [
  ["Characters","characters.html"],["Items","items.html"],["Builds","builds.html"],["Ranks","ranks.html"]
];
const RANK_NAMES = ['Obscurus','Initiate','Seeker','Acolyte','Sentinel','Mystic','Ritualist','Emissary','Oracle','Phantom','Ascendant','Eternus'];   // tier 0-11
const SITE = { gamesTracked: "1,284,390" };
const ITEMS = [
  {name:"Disarming Hex",img:"img/items/spirit/disarming-hex.webp",cost:3200,stats:["+75 Bonus Health","0.75m Sprint Speed"],desc:"Disarms enemy target and reduces their Bullet Resist.",cd:"16s"},
  {name:"Rusted Barrel",img:"img/items/spirit/rusted-barrel.webp",cost:500,stats:["+8% Ammo","+10% Bullet Lifesteal"],desc:"Boosts your weapon's damage output."},
  {name:"Extra Spirit",img:"img/items/spirit/extra-spirit.webp",cost:800,stats:["+8 Spirit Power","+15% Spirit Resist"],desc:"A reliable early spirit item."},
  {name:"Enchanter's Emblem",img:"img/items/vitality/enchanters-emblem.webp",cost:1600,stats:["+10 Spirit Power"],desc:"Shields you and an ally.",cd:"20s"},
  {name:"Mystic Burst",img:"img/items/spirit/mystic-burst.webp",cost:1250,stats:["+12 Spirit Power"],desc:"Spirit damage burst on ability use."},
  {name:"Fleetfoot",img:"img/items/weapon/fleetfoot.webp",cost:3200,stats:["+3 Sprint Speed"],desc:"Move faster in and out of combat."}
];
const PLAYER = { name:"PlayerName" };
const OVERVIEW = [["Ranked","0W 0L","0.0%"],["Normal","19W 16L","54.3%"],["Street Brawl","11W 9L","55.0%"]];
const HEROES = [
  ["Violet","6.05:1","7.0 / 4.3 / 19.0","80%",10],["Celeste","5.09:1","7.0 / 3.9 / 12.8","44%",9],
  ["Lash","5.62:1","5.6 / 4.1 / 17.7","57%",7],["Silver","4.00:1","6.0 / 3.0 / 6.0","0%",3],
  ["Pocket","3.60:1","9.5 / 5.0 / 8.5","50%",2],["Infernus","0.88:1","4.0 / 8.0 / 3.0","0%",1],
  ["Lady Geist","11.00:1","2.0 / 1.0 / 9.0","100%",1]
];
const YOU_STATS = { wr:"61%", kda:"5.8", cs:"4.1" };
const THEM_STATS = { wr:"54%", kda:"5.3", cs:"3.9" };
const YOU_BUILD = [0,2,3,4,1,5];   /* indexes into ITEMS */
const MATCHES = [
  {win:true, mode:"Normal",ago:"7 days ago",kda:"11 / 5 / 18",ratio:"5.80 KDA",cs:"230 CS (3.9/m)",dur:"38:39",build:[0,1,2,3,4,5]},
  {win:false,mode:"Normal",ago:"4 days ago",kda:"9 / 6 / 5",ratio:"2.33 KDA",cs:"185 CS (4.8/m)",dur:"38:19",build:[1,2,0,5,4,3]},
  {win:true, mode:"Normal",ago:"7 days ago",kda:"15 / 2 / 14",ratio:"14.50 KDA",cs:"165 CS (4.3/m)",dur:"37:56",build:[2,3,4,0,1,5]},
  {win:true, mode:"Street Brawl",ago:"9 days ago",kda:"8 / 4 / 10",ratio:"4.50 KDA",cs:"150 CS (4.0/m)",dur:"21:10",build:[3,4,5,1,2,0]}
];
const NAMES = ["pineapple","Skelly","Midnight","berry fan","Tonboh","Psychic","Stupiddog","Illmanu","ikewilm","Vimid","yougotit","Olive gal"];
