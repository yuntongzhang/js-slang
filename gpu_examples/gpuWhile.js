/**
 * Simple while loop example in Source.
 */
let input = [1,2,3,4,5];
let i = 0;

while (i < array_length(input)) {
  input[i] = (x => x + 1)(input[i]);
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
// const kernel = gpu.createKernel(function (x) {
//   return (x => x + 1)(x[this.thread.x]);
// }).setOutput([array_length(input)]);
// input = kernel(input);