// Matter JS
const { Engine, Render, Runner, World, Bodies, Body, Events } = Matter;
const engine = Engine.create();
const { world } = engine;

// Game screen size
const width = window.innerWidth;
const height = window.innerHeight - 4; // otherwise, sometimes a vertical scrollbar appears in Chrome :/

// Game difficulty settings
const cellsHorizontalStart = 3; // start amount of horizontal cells, fist game size
const cellsHorizontalMax = 4; // max amount of horizontal cells, last game size
let cellsHorizontal = cellsHorizontalStart; // the game starts with the easiest level.

const instructions = () => {
	// TBA: the canvas should only appear when the start button is clicked
	const startBtn = document.querySelector('#start');
	startBtn.addEventListener('click', () => {
		console.log('start button clicked.');
		document.querySelector('.instructions').classList.add('hidden');
	});
};

instructions();

const createGameFrame = () => {
	const render = Render.create({
		element : document.body,
		engine  : engine,
		options : {
			wireframes : false,
			width      : width,
			height     : height
		}
	});

	Render.run(render);
	Runner.run(Runner.create(), engine);
};

// Create the canvas
createGameFrame();

const createBorders = () => {
	// borders
	const borders = [
		Bodies.rectangle(width / 2, 0, width, 2, { label: 'border', isStatic: true }),
		Bodies.rectangle(width / 2, height, width, 2, { label: 'border', isStatic: true }),
		Bodies.rectangle(0, height / 2, 2, height, { label: 'border', isStatic: true }),
		Bodies.rectangle(width, height / 2, 2, height, { label: 'border', isStatic: true })
	];
	World.add(world, borders);
};

createBorders();

const generateNewGame = () => {
	engine.world.gravity.y = 0;
	let cellsVertical = Math.floor(height / width * cellsHorizontal) + 1;
	const unitLengthX = width / cellsHorizontal;
	const unitLengthY = height / cellsVertical;

	// Maze generation

	const shuffle = (arr) => {
		let counter = arr.length;

		while (counter > 0) {
			const index = Math.floor(Math.random() * counter);

			counter--;

			const temp = arr[counter];
			arr[counter] = arr[index];
			arr[index] = temp;
		}
		return arr;
	};

	const grid = Array(cellsVertical).fill(null).map(() => Array(cellsHorizontal).fill(false));
	const verticals = Array(cellsVertical).fill(null).map(() => Array(cellsHorizontal - 1).fill(false));
	const horizontals = Array(cellsVertical - 1).fill(null).map(() => Array(cellsHorizontal).fill(false));

	const startRow = Math.floor(Math.random() * cellsVertical);
	const startColumn = Math.floor(Math.random() * cellsHorizontal);

	const stepThroughCell = (row, column) => {
		// If this cell at [row, column] was already visited, then return (do nothing)
		if (grid[row][column] === true) {
			return;
		}

		// If it was not visited before, it is visited now. Mark as visited.
		grid[row][column] = true;
		// Assemble randomly-ordered list of neighbors
		//prettier-ignore
		const neighbors = shuffle([
		[row - 1, column    , 'up'   ],
		[row    , column + 1, 'right'],
		[row + 1, column    , 'down' ],
		[row    , column - 1, 'left' ]
	]);
		// For each neighbor...
		for (let neighbor of neighbors) {
			// prettier-ignore
			const [nextRow,	nextColumn,	direction] = neighbor;

			// see if that neighbor is out of bounds
			if (nextRow < 0 || nextRow >= cellsVertical || nextColumn < 0 || nextColumn >= cellsHorizontal) {
				continue; // skip everything, start new iteration
			}
			// if this neighbor was already visited, skip to the next one.
			if (grid[nextRow][nextColumn]) {
				continue;
			}
			// Remove a wall from either horizontals or verticals
			if (direction === 'left') {
				verticals[row][column - 1] = true;
			}
			else if (direction === 'right') {
				verticals[row][column] = true;
			}
			else if (direction === 'up') {
				horizontals[row - 1][column] = true;
			}
			else if (direction === 'down') {
				horizontals[row][column] = true;
			}
			stepThroughCell(nextRow, nextColumn);
		}
	};

	// Draw walls, horizontal and vertical
	const wallRemovalTool = () => {
		horizontals.forEach((row, rowIndex) => {
			row.forEach((open, columnIndex) => {
				if (open) {
					return;
				}
				const wall = Bodies.rectangle(
					columnIndex * unitLengthX + unitLengthX / 2,
					rowIndex * unitLengthY + unitLengthY,
					unitLengthX,
					5,
					{
						label    : 'wall',
						isStatic : true,
						render   : {
							fillStyle : 'red'
						}
					}
				);
				World.add(world, wall);
			});
		});

		verticals.forEach((row, rowIndex) => {
			row.forEach((open, columnIndex) => {
				if (open) {
					return;
				}
				const wall = Bodies.rectangle(
					columnIndex * unitLengthX + unitLengthX,
					rowIndex * unitLengthY + unitLengthY / 2,
					5,
					unitLengthY,
					{
						label    : 'wall',
						isStatic : true,
						render   : {
							fillStyle : 'red'
						}
					}
				);
				World.add(world, wall);
			});
		});
	};

	// Goal

	const goal = Bodies.rectangle(
		width - unitLengthX / 2,
		height - unitLengthY / 2,
		0.7 * unitLengthX,
		0.7 * unitLengthY,
		{
			isStatic : true,
			label    : 'goal',
			render   : {
				fillStyle : 'green'
			}
		}
	);

	// Ball
	const ballRadius = Math.min(unitLengthX, unitLengthY) * 0.33;
	const ball = Bodies.circle(unitLengthX / 2, unitLengthY / 2, ballRadius, {
		label  : 'ball',
		render : {
			fillStyle : 'blue'
		}
	});

	// Event listener KEYDOWN

	document.addEventListener('keydown', (e) => {
		const { x, y } = ball.velocity;
		if (e.keyCode === 87) {
			Body.setVelocity(ball, { x: x, y: y - 5 });
		}
		if (e.keyCode === 68) {
			Body.setVelocity(ball, { x: x + 5, y: y });
		}
		if (e.keyCode === 83) {
			Body.setVelocity(ball, { x: x, y: y + 5 });
		}
		if (e.keyCode === 65) {
			Body.setVelocity(ball, { x: x - 5, y: y });
		}
	});

	// Win Condition

	Events.on(engine, 'collisionStart', (event) => {
		event.pairs.forEach((collision) => {
			const labels = [
				'ball',
				'goal'
			];

			if (labels.includes(collision.bodyA.label) && labels.includes(collision.bodyB.label)) {
				world.gravity.y = 1;
				world.bodies.forEach((body) => {
					if (body.label === 'wall' || body.label === 'goal') {
						Body.setStatic(body, false);
					}
				});
				if (cellsHorizontal < cellsHorizontalMax) {
					document.querySelector('.winner').classList.remove('hidden');
					document.querySelector('#winText').innerHTML = 'You win this time';
					document.querySelector('#btnRestart').innerHTML = 'Next Stage';
				}
				else {
					document.querySelector('.winner').classList.remove('hidden');
					document.querySelector('#winText').innerHTML = 'You are a real WINNER!';
					document.querySelector('#btnRestart').innerHTML = 'New Game';
				}
			}
		});
	});

	stepThroughCell(startRow, startColumn);
	wallRemovalTool();
	World.add(world, goal);
	World.add(world, ball);
};
generateNewGame();

// logic about what happens after you click the button.

const btn = document.querySelector('#btnRestart');
btn.addEventListener('click', () => {
	World.clear(world);
	document.querySelector('.winner').classList.add('hidden');
	if (cellsHorizontal < cellsHorizontalMax) {
		// go to next level with a more complex maze
		console.log('cellsHorizontal < cellsHorizontalMax');
		cellsHorizontal++;
		createBorders();
		generateNewGame();
	}
	else {
		// restart the entire game with lowest number of cells.
		console.log('cellsHorizontal > cellsHorizontalMax');
		cellsHorizontal = cellsHorizontalStart;
		createBorders();
		generateNewGame();
	}

	// location.reload();
});
