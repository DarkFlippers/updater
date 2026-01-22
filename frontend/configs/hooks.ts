import { exec } from 'child_process';
import { bgGreen, green, inverse, black, underline } from 'kolorist';

const dot = '•';
const banner = 'Hooks ' + dot;
const greenBanner = green(banner);

export const flipperzeroProtobufUpdate = () => {
  const startTime = Date.now()
  console.log()
  console.log(
    ` ${greenBanner} ${inverse(' WAIT ')} ${dot} Updating of ${underline(
      green('flipperzero-protobuf')
    )} in progress...`
  )

  return new Promise((resolve, reject) => {
    exec(
      'git submodule update --init --remote --merge -- ./src/shared/lib/flipperzero-protobuf',
      (err, stdout, stderr) => {
        if (err) {
          reject(err)
        }
        if (stdout) {
          const diffTime = +new Date() - startTime
          console.log(
            ` ${greenBanner} ${bgGreen(black(' DONE '))} ${green(
              dot +
                ' ' +
                underline('Flipperzero-protobuf') +
                ' updated with success ' +
                dot +
                ' ' +
                diffTime +
                'ms'
            )}`
          )
          console.log()
        }
        if (stderr) {
          console.error('stderr', stderr)
        }
        resolve(true)
      }
    )
  })
}

export const compileProtofiles = () => {
  const startTime = Date.now()
  console.log()
  console.log(
    ` ${greenBanner} ${inverse(' WAIT ')} ${dot} Compiling of ${underline(
      green('Protofiles')
    )} in progress...`
  )

  return new Promise((resolve, reject) => {
    exec(
      'pbjs -t static-module -w es6 --no-comments --lint "eslint-disable block-scoped-var, id-length, no-control-regex, no-magic-numbers, no-prototype-builtins, no-redeclare, no-shadow, no-var, sort-vars, camelcase, default-case-last, no-mixed-operators" -o src/shared/lib/flipperJs/protobufCompiled.js ./src/shared/lib/flipperzero-protobuf/*.proto && echo ""',
      (err, stdout, stderr) => {
        if (err) {
          reject(err)
        }
        if (stdout) {
          const diffTime = +new Date() - startTime
          console.log(
            ` ${greenBanner} ${bgGreen(black(' DONE '))} ${green(
              dot +
                ' ' +
                underline('Protofiles') +
                ' compiled with success ' +
                dot +
                ' ' +
                diffTime +
                'ms'
            )}`
          )
          console.log()
        }
        if (stderr) {
          console.error('stderr', stderr)
        }
        resolve(true)
      }
    )
  })
}