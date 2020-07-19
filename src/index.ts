function loadImage(src: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
        const image = new Image()
        image.addEventListener('load', _ => resolve(image))
        image.addEventListener('error', _ => reject(new Error(`Failed to load image ${src}`)))
        image.src = src
    })
}

type GameAssets = {
    background: HTMLImageElement,
    tileset: HTMLImageElement,
    statusarea: HTMLImageElement
}

const BOARD_WIDTH = 12
const BOARD_HEIGHT = 8
const TILE_WIDTH = 56
const TILE_HEIGHT = 66

type EmptyTile = {
    type: "empty"
}

type Stone = {
    type: "stone",
    symbol: number,
    color: number
}

type Tile = EmptyTile | Stone

type Board = {
    background: number[]
    tiles: Tile[]
    stoneStack: Stone[]
}

async function loadGameAssets(): Promise<GameAssets> {
    const backgroundLoader = loadImage("Background.png")
    const tilesetLoader = loadImage("Tileset.png")
    const statusareaLoader = loadImage("Statusarea.png")
    const [background, tileset, statusarea] = await Promise.all([backgroundLoader, tilesetLoader, statusareaLoader])
    return {
        background, tileset, statusarea
    }
}

function isInitialStonePosition(args: { x: number, y: number}): boolean {
    const { x, y } = args
    return ((x == 0 || x == BOARD_WIDTH - 1) && (y == 0 || y == BOARD_HEIGHT - 1))
        || (x == BOARD_WIDTH / 2 && y == BOARD_HEIGHT / 2 )
        || (x == BOARD_WIDTH / 2 - 1 && y == BOARD_HEIGHT / 2 - 1)
}

function randomInt(max: number) : number {
    return Math.floor(Math.random() * max)
}

function generatePlacedStones(): Stone[] {
    let colors = [0, 1, 2, 3, 4, 5]
    let symbols = [0, 1, 2, 3, 4, 5]
    const placedStones : Stone[] = []
    while (colors.length > 0) {
        const maxIndex = colors.length
        const color = colors[randomInt(maxIndex)]
        const symbol = symbols[randomInt(maxIndex)]
        const stone: Stone = { type: "stone", color, symbol }
        placedStones.push(stone)
        colors = colors.filter(v => v !== color)
        symbols = symbols.filter(v => v !== symbol)
    }
    return placedStones
}

function equals(s1: Stone, s2: Stone) {
    return s1.type === "stone" && s2.type === "stone"
        && s1.color === s2.color && s1.symbol === s2.symbol
}

/**
 * Shuffles the array in place with the Fisher Yates algorithm.
 */
function shuffle<T>(array: T[]) {
    for(let i = array.length - 1; i > 0; i--) {
        const j = randomInt(i)
        const temp = array[i]
        array[i] = array[j]
        array[j] = temp
    }
}

function generateBoard(): Board {
    const background = []
    const tiles = []
    let placedStones = generatePlacedStones()
    let initialStones = placedStones.slice()
    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            background[x + y * BOARD_WIDTH] = randomInt(4)
            const tile : Tile = isInitialStonePosition({x, y}) ? initialStones.pop() as Tile : { type: "empty"}
            tiles[x + y * BOARD_WIDTH] = tile
        }
    }
    const stoneStack: Stone[] = []
    for (let count = 0; count < 2; count++) {
        for (let color = 0; color < 6; color++) {
            for (let symbol = 0; symbol < 6; symbol++) {
                const stone: Stone = {
                    type: "stone", color, symbol
                }
                const previousPlacedStones = placedStones
                placedStones = placedStones.filter(s => !equals(s, stone))
                if (previousPlacedStones.length === placedStones.length) {
                    stoneStack.push(stone)
                }
            }
        }    
    }
    shuffle(stoneStack)
    return {
        background,
        tiles,
        stoneStack
    }
}

function drawBoard(ctx: CanvasRenderingContext2D, board: Board, assets: GameAssets) {
    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            const tile = board.tiles[x + y * BOARD_WIDTH]
            switch (tile.type) {
                case "empty": {
                    const background = board.background[x + y * BOARD_WIDTH]
                    const tileY = (y == 0 || y == BOARD_HEIGHT - 1) || (x == 0 || x == BOARD_WIDTH - 1) ? 0 : TILE_HEIGHT
                    ctx.drawImage(assets.background, background * TILE_WIDTH, tileY, TILE_WIDTH, TILE_HEIGHT, 
                        x * TILE_WIDTH, y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT)
                    break
                }
                case "stone": {
                    const { color, symbol } = tile
                    const tileX = color * TILE_WIDTH
                    const tileY = symbol * TILE_HEIGHT
                    ctx.drawImage(assets.tileset, tileX, tileY, TILE_WIDTH, TILE_HEIGHT, 
                        x * TILE_WIDTH, y * TILE_HEIGHT, TILE_WIDTH, TILE_HEIGHT)
                    break
                }          
            }
        }
    }
    ctx.drawImage(assets.statusarea, TILE_WIDTH * BOARD_WIDTH, 0)
    const nextTile = board.stoneStack[0]
    if (nextTile) {
        const { color, symbol } = nextTile
        const tileX = color * TILE_WIDTH
        const tileY = symbol * TILE_HEIGHT
        ctx.drawImage(assets.tileset, tileX, tileY, TILE_WIDTH, TILE_HEIGHT, 
            800 - (800 - TILE_WIDTH * BOARD_WIDTH) / 2 - TILE_WIDTH / 2, TILE_HEIGHT / 2, TILE_WIDTH, TILE_HEIGHT)
    }
    ctx.textAlign = "center"
    ctx.fillText(`Stones: ${board.stoneStack.length}`, 800 - (800 - TILE_WIDTH * BOARD_WIDTH) / 2, TILE_HEIGHT * 3)
}

async function initGame() {
    const canvas = document.getElementById('ishido') as HTMLCanvasElement
    const ctx = canvas.getContext('2d')

    if (!ctx) {
        alert("Your browser isn't supported by this game!")
        return
    }
    console.log("Loading images..")
    const gameAssets = await loadGameAssets()
    console.log("Images loaded!")
    const board = generateBoard()
    drawBoard(ctx, board, gameAssets)
}

window.onload = initGame
