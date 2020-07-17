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

type Piece = {
    type: "piece",
    symbol: number,
    color: number
}

type Tile = EmptyTile | Piece

type Board = {
    background: number[]
    tiles: Tile[]
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

function initialPiecePosition(args: { x: number, y: number}): boolean {
    const { x, y } = args
    return ((x == 0 || x == BOARD_WIDTH - 1) && (y == 0 || y == BOARD_HEIGHT - 1))
        || (x == BOARD_WIDTH / 2 && y == BOARD_HEIGHT / 2 )
        || (x == BOARD_WIDTH / 2 - 1 && y == BOARD_HEIGHT / 2 - 1)
}

function randomInt(max: number) : number {
    return Math.floor(Math.random() * max)
}

function generateBoard(): Board {
    const background = []
    const tiles = []
    for (let x = 0; x < BOARD_WIDTH; x++) {
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            background[x + y * BOARD_WIDTH] = randomInt(4)
            const tile : Tile = initialPiecePosition({x, y}) ? { type: "piece", color: randomInt(6), symbol: randomInt(6)} : { type: "empty"}
            tiles[x + y * BOARD_WIDTH] = tile
        }
    }
    return {
        background,
        tiles
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
                case "piece": {
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
