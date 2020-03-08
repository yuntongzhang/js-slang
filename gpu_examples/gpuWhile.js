/**
 * Simple while loop example in Source.
 */
let input = [1,2,3,4,5];
let i = 0;
const f = x => x + 1;

while (i < array_length(input)) {
  input[i] = f(input[i]);
  i = i+1;
}

/**
 * Should be translated into the following program.
 */
// import statements for browser
//<script src="dist/gpu-browser.min.js"></script>
//<script>
//    const gpu = new GPU();
//</script>


// importing statements for node (ts)
// import { GPU } from 'gpu.js';
// const gpu = new GPU();

// let input = [1,2,3,4,5];
// const f = x => x + 1;
// const kernel = gpu.createKernel(function (x) {
//   return f(x[this.thread.x]);
// }).setOutput([array_length(input)]);
// input = kernel(input);