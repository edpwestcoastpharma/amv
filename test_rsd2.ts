const arr = [ 984821, 992411, 1000000, 1007589, 1015179 ];
const mean = arr.reduce((a,b)=>a+b)/5;
const sd = Math.sqrt(arr.reduce((a,b)=>a+(b-mean)**2,0)/4);
console.log(sd/mean * 100);
