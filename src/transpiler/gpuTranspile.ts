import { simple } from 'acorn-walk/dist/walk'
import * as es from 'estree'
import { parse as acornParse, Options as AcornOptions } from 'acorn'

/**
 * Aim to identify the following program:
 * let input = [1,2,3,4,5];
 * let i = 0;
 * const f = x => x + 1;
 * while (i < array_length(input)) {
 *   input[i] = f(input[i]);
 *   i = i+1;
 * }
 *
 * Assume the names used in while loop are valid
 * The variable types used in while loop can be checked if type inference
 * is available.
 *
 * To be transformed into the following program:
 * let input = [1,2,3,4,5];
 * const f = x => x + 1;
 * const kernel = gpu.createKernel(function (x) {
 *   return f(x[this.thread.x]);
 * }).setOutput([array_length(input)]);
 * input = kernel(input);
 *
 */
export function transformWhileToKernelOp(program: es.Program) {
  simple(program, {
    WhileStatement(node) {
      // basic checks
      const testExpression = (node as es.WhileStatement).test
      if (testExpression.type !== 'BinaryExpression') {
        return
      }
      if (testExpression.operator !== '<') {
        return
      }
      const loopControlVar = (testExpression.left as es.Identifier).name
      // check for 'array_length' call
      if (testExpression.right.type !== 'CallExpression') {
        return
      }
      const testRightCalleeName = (testExpression.right.callee as es.Identifier).name
      if (testRightCalleeName !== 'array_length') {
        return
      }
      // check for body
      const bodyStatements = ((node as es.WhileStatement).body as es.BlockStatement).body
      // look for loop control variable (LCV) assignment and array element assignment expr
      let loopControlVarPresent = false
      let arrayName: string | undefined // the array name to be use in GPU.js code
      let functionApplied: string | undefined // the function name to be used in GPU.js code
      for (const statement of bodyStatements) {
        if (statement.type !== 'ExpressionStatement') {
          continue
        }
        const expr = (statement as es.ExpressionStatement).expression
        if (expr.type !== 'AssignmentExpression') {
          continue
        }
        const assignedExpr = (expr as es.AssignmentExpression).left
        if (
          assignedExpr.type === 'Identifier' &&
          (assignedExpr as es.Identifier).name === loopControlVar
        ) {
          // found assignment to LCV
          // TODO: check for increment by 1 on LCV
          loopControlVarPresent = true
        }
        // assume there is only one MemeberExpression in while body
        if (assignedExpr.type === 'MemberExpression') {
          // look for array name
          const indexName = ((assignedExpr as es.MemberExpression).property as es.Identifier).name
          if (indexName !== loopControlVar) {
            return
          }
          arrayName = ((assignedExpr as es.MemberExpression).object as es.Identifier).name
          // go to the RHS of assignment and get the name of function applied
          functionApplied = ((expr.right as es.CallExpression).callee as es.Identifier).name
        }
      }
      // reject if LCV is not incremented in while body
      if (!loopControlVarPresent) {
        return
      }
      // reject if no array name is used in while body
      if (!arrayName || !functionApplied) {
        return
      }
      // TODO: more checks can be added, such as typing of various expressions (need type inference)
      // generate AST of corresponding GPU.js code
      const newNode: es.BlockStatement = (acornParse(
        generateKernelCode(arrayName, functionApplied),
        gpuParseOptions
      ) as unknown) as es.BlockStatement
      // adjust fields of the original node
      node.type = 'BlockStatement'
      node = node as es.BlockStatement
      node.body = newNode.body
    }
  })
}

function generateKernelCode(arrayName: string, functionApplied: string) {
  // underscore in nameto avoid clashing
  const code = `const _gpu = new GPU();
                const _kernel = _gpu.createKernel(function (x) {
                  return ${functionApplied}(x[this.thread.x]);
                }).setOutput([array_length(${arrayName})]);
                ${arrayName} = kernel(${arrayName});`
  return code
}

const gpuParseOptions: AcornOptions = {
  sourceType: 'module',
  ecmaVersion: 6,
  allowImportExportEverywhere: true,
  locations: true // TODO: not sure whether should keep this
}
