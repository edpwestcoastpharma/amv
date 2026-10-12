const list = [1,2,3,4,5];
const pairs = [];
for (let i = 0; i < list.length; i+=2) {
  pairs.push(list.slice(i, i+2));
}
console.log(pairs);
