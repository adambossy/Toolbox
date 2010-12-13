-- implementation of unix/bash `cp` in haskell

import System.Environment
 
    main = do
        [f,g] <- getArgs
        s     <- readFile f
        writeFile g s
