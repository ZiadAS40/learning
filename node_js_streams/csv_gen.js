// generate-users-csv.js
const fs = require("fs");
const path = require("path");

const OUTPUT = path.join(__dirname, "data.csv");
const TOTAL_ROWS = 10000;

const firstNames = [
  "Liam","Noah","Oliver","Elijah","James","William","Benjamin","Lucas","Henry","Alexander",
  "Olivia","Emma","Ava","Sophia","Isabella","Charlotte","Amelia","Mia","Harper","Evelyn",
  "Fatima","Youssef","Amina","Omar","Layla","Karim","Zara","Hassan","Nadia","Samir",
  "Chen","Wei","Li","Hiro","Yuki","Sora","Min","Ji","An","Tao",
  "Mateo","Santiago","Valentina","Camila","Diego","Lucia","Javier","Rosa","Carlos","Elena"
];

const lastNames = [
  "Smith","Johnson","Brown","Taylor","Anderson","Thomas","Jackson","White","Harris","Martin",
  "Garcia","Martinez","Rodriguez","Lopez","Gonzalez","Perez","Sanchez","Ramirez","Torres","Flores",
  "Hussein","Abdullah","Khan","Ali","Rahman","Chowdhury","Nakamura","Tanaka","Yamamoto","Watanabe",
  "Dubois","Moreau","Laurent","Fischer","Schmidt","Keller","Novak","Horvat","Silva","Costa"
];

const domains = [
  "gmail.com","yahoo.com","outlook.com","hotmail.com","icloud.com",
  "proton.me","fastmail.com","mail.com","example.org","company.io",
  "startup.dev","tech.ai","data.net","web.app","service.co"
];

const separators = ["", ".", "_", "-"];

// Random helpers
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function rand(arr) {
  return arr[randInt(0, arr.length - 1)];
}

function randomAge() {
  return randInt(18, 85);
}

function randomName() {
  return `${rand(firstNames)} ${rand(lastNames)}`;
}

function randomEmail(name) {
  const [first, last] = name.toLowerCase().split(" ");
  const sep = rand(separators);

  const patterns = [
    `${first}${sep}${last}`,
    `${first}${sep}${last}${randInt(1, 999)}`,
    `${first[0]}${sep}${last}`,
    `${first}${sep}${last[0]}`,
    `${last}${sep}${first}`,
    `${first}${randInt(100,999)}`
  ];

  return `${rand(patterns)}@${rand(domains)}`;
}

// Create write stream
const stream = fs.createWriteStream(OUTPUT);

// CSV header
stream.write("id,name,age,email\n");

let i = 1;

function write() {
  let ok = true;

  while (i <= TOTAL_ROWS && ok) {
    const name = randomName();
    const age = randomAge();
    const email = randomEmail(name);

    const row = `${i},"${name}",${age},${email}\n`;
    ok = stream.write(row);
    i++;
  }

  if (i <= TOTAL_ROWS) {
    stream.once("drain", write);
  } else {
    stream.end();
  }
}

write();

stream.on("finish", () => {
  console.log(`Generated ${TOTAL_ROWS} CSV rows at: ${OUTPUT}`);
});