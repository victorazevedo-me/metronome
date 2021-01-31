import { useRef, useState, useEffect } from 'react'
import Pizzicato from 'pizzicato'
// eslint-disable-next-line
import MoreSettings from './MoreSettings'
import './App.css'

function App(): JSX.Element {
	/**
	 *
	 * States & Values
	 *
	 */

	const Notes = [
		['a', 220.0],
		['a#', 233.08],
		['b', 246.94],
		['c', 261.63],
		['c#', 277.18],
		['d', 293.66],
		['e', 311.13],
		['f', 349.23],
		['f#', 369.99],
		['g', 392.0],
		['g#', 415.3],
	]

	const defaultLayer = {
		id: setRandomID(),
		beats: 4,
		time: 1,
		frequency: 0,
	}

	const [moreSettings, setMoreSettings] = useState({
		theme: 'lightgreen',
		sound: {
			type: 'sawtooth',
			attack: 0.0,
			release: 0.1,
			volume: 0.1,
		},
		segment: {
			on: true,
			count: 0,
			ratios: [0],
			duplicates: [0],
			dupCount: 1,
		},

		unlimitedMode: false,
	})

	const [metronome, setMetronome] = useState({
		layers: [
			{
				id: setRandomID(),
				beats: 2,
				time: 1,
				frequency: 1,
			},
			{
				id: setRandomID(),
				beats: 4,
				time: 1,
				frequency: 5,
			},
		],
		startTime: 0,
		isRunning: false,
		tempo: 80,
		tap: [
			{
				date: 0,
				wait: 0,
			},
		],
	})

	// Use Refs for async timeouts
	const metronomeRef = useRef(metronome)
	metronomeRef.current = metronome

	const moreSettingsRef = useRef(moreSettings)
	moreSettingsRef.current = moreSettings

	/**
	 *
	 * Small functions
	 *
	 */

	const getLayerFromId = (id: string) =>
		metronomeRef.current.layers.filter(ll => ll.id === id)[0]

	const calculateTempoMs = (beats: number, tempo: number) => 60000 / ((beats / 4) * tempo)

	function setRandomID() {
		let xx = ''
		while (xx.length < 8) xx += String.fromCharCode(Math.random() * (122 - 97) + 97)
		return xx
	}

	// eslint-disable-next-line
	function changeSoundOptions(e: any, which: string) {
		const opt = moreSettings.sound
		const val = e.target.value
		opt[which] = which === 'type' ? val : +val

		setMoreSettings(prev => ({
			...prev,
			sound: opt,
		}))
	}

	const initSegment = () => {
		function getDuplicates(list: number[]) {
			// Creates list of duplicates per division
			// [1, 3, 1 ...]

			const duplicates: number[] = []

			list.forEach((elem, index) =>
				list[index] !== list[index - 1]
					? duplicates.push(1)
					: duplicates[duplicates.length - 1]++
			)

			return duplicates
		}

		function getRatios(list: number[]) {
			// Removes duplicates
			// segment ratio [next - current]

			list = [0, ...new Set(list), 1]
			const ratios: number[] = []

			for (const i in list) ratios.push(list[+i + 1] - list[+i])
			return ratios
		}

		const division: number[] = []

		// Fill with all layers divisions & sort
		metronome.layers.forEach(layer => {
			for (let k = 1; k < layer.beats; k++) division.push(k / layer.beats)
		})
		division.sort()

		// Apply functions
		setMoreSettings(prev => ({
			...prev,
			segment: {
				...prev.segment,
				ratios: getRatios(division),
				duplicates: getDuplicates(division),
			},
		}))
	}

	useEffect(() => {
		// Add Spacebar to control metronome
		document.addEventListener('keydown', (e: any) => {
			if (e.keyCode === 32) launchMetronome(metronomeRef.current.isRunning)
		})

		// Init segment with ratios
		initSegment()

		// eslint-disable-next-line
	}, [])

	//
	//
	// Main functions
	//
	//

	function metronomeInterval(nextDelay: number, id: string) {
		//
		const timeoutID = window.setTimeout(() => {
			const current = metronomeRef.current
			const layer = getLayerFromId(id)

			// Quit recursion if stopped or removed
			if (!current.isRunning || layer === undefined) {
				clearTimeout(timeoutID)
				return
			}

			const tempoMs = calculateTempoMs(layer.beats, current.tempo)

			// Update beat time
			// Return to 1 if 'time' above 'beats'
			setMetronome(prev => ({
				...prev,
				layers: prev.layers.map(layer =>
					layer.id === id
						? { ...layer, time: layer.time >= layer.beats ? 1 : layer.time + 1 }
						: layer
				),
			}))

			// Update Segment Count, if its on
			const segment = moreSettingsRef.current.segment
			if (segment.on) {
				//
				let segmentTemp = segment

				if (segment.dupCount < segment.duplicates[segment.count]) {
					// If duplicates, don't move count
					segmentTemp.dupCount++
				} else {
					segmentTemp.dupCount = 1

					// Control count interval edges
					// Conditions for [0 ... n]
					const allAtOne = current.layers.every(l => l.time === 1)
					const oneAtMax = layer.time === layer.beats
					segmentTemp.count = allAtOne ? 1 : oneAtMax ? 0 : segment.count + 1
				}

				setMoreSettings(prev => ({
					...prev,
					segment: segmentTemp,
				}))
			}

			//
			// Play sound
			//
			const wave = new Pizzicato.Sound({
				source: 'wave',
				options: {
					...moreSettingsRef.current.sound,
					frequency: Notes[layer.frequency][1],
				},
			})
			wave.play()
			setTimeout(() => wave.stop(), 20)

			// Calculate latency
			const latencyOffset =
				current.startTime > 0 ? (Date.now() - current.startTime) % tempoMs : 0

			// Recursion
			metronomeInterval(tempoMs - latencyOffset, id)
		}, nextDelay)
	}

	function launchMetronome(runs: boolean) {
		const current = metronomeRef.current

		if (runs) {
			//
			// Stops
			//
			setMoreSettings(prev => ({
				...prev,
				segment: {
					...prev.segment,
					count: 0,
				},
			}))
			setMetronome(args => ({
				...args,

				// Each set to new defaults
				layers: current.layers.map(l => ({
					...l,
					time: 1,
					id: setRandomID(),
				})),

				isRunning: false,
				startTime: 0,
			}))
		} else {
			//
			// Starts
			//
			current.layers.forEach(layer =>
				metronomeInterval(calculateTempoMs(layer.beats, current.tempo), layer.id)
			)
			// Update to start state
			setMetronome(args => ({
				...args,
				isRunning: true,
				startTime: Date.now(),
			}))
		}
	}

	const changeLayerBeats = (e: any, i: number) => {
		const val = +e.target.value
		let layers = metronome.layers

		// Minimum 2 beats
		layers[i].beats = val > 1 ? val : 2

		//Update
		setMetronome(prev => ({ ...prev, layers }))
		if (moreSettings.segment.on) initSegment()
	}

	const changeFrequency = (e: any, i: number) => {
		const layers = metronome.layers
		layers[i].frequency = +e.target.value

		setMetronome(prev => ({ ...prev, layers }))
	}

	const updateLayer = (which: 'remove' | 'add', index?: number) => {
		const layers = metronome.layers

		// Remove
		if (which === 'remove' && layers.length > 1 && index !== undefined)
			layers.splice(index, 1)

		// Add
		if (which === 'add' && layers.length < 4) layers.push(defaultLayer)

		// Update
		setMetronome(prev => ({ ...prev, layers }))
		if (moreSettings.segment.on) initSegment()
	}

	const tapTempo = () => {
		const tap = metronome.tap

		// Reset tap after 2s
		if (Date.now() - tap[0].date > 2000) {
			setMetronome(prev => ({
				...prev,
				tap: [
					{
						date: Date.now(),
						wait: 0,
					},
				],
			}))
		} else {
			//
			// Wait is offset between two taps
			tap.unshift({
				date: Date.now(),
				wait: Date.now() - metronome.tap[0].date,
			})

			// Array of tap offsets
			const cumul: number[] = []

			// Removes first, only keeps 6 at a time
			tap.forEach((each, i) => {
				if (each.wait > 0) cumul.push(each.wait)
				if (each.wait === 0 || i === 6) tap.pop()
			})

			setMetronome(prev => ({
				...prev,
				tap,

				// Get average tempo
				tempo: Math.floor(
					60000 / (cumul.reduce((a: number, b: number) => a + b) / cumul.length)
				),
			}))
		}
	}

	return (
		<div className={'App ' + moreSettings.theme}>
			<div className="title">
				<h1>Poly-tronome</h1>
				<p>Train your polyrythms</p>
			</div>

			<div
				className={
					'clicks-wrap ' + (moreSettingsRef.current.segment.on ? 'segment' : 'layers')
				}
			>
				<div className="segment-wrap">
					{moreSettings.segment.ratios.map((ratio, i) => (
						<span
							key={i}
							className={
								'segment-child' +
								(moreSettings.segment.count === i ? ' on' : '')
							}
							style={{
								width: `calc(${ratio * 100}% - 10px)`,
							}}
						/>
					))}
				</div>

				<div className="layers-wrap">
					{metronome.layers.map((layer, jj) => {
						// Add clicks for each layers

						const children: JSX.Element[] = []
						for (let kk = 0; kk < layer.beats; kk++)
							children.push(
								<div
									key={kk}
									className={+kk <= layer.time - 1 ? 'click on' : 'click'}
								/>
							)

						// Wrap in rows & return
						return (
							<div key={jj} className="clicks-wrap">
								{children}
							</div>
						)
					})}
				</div>
			</div>

			<div>
				<button onMouseDown={() => launchMetronome(metronome.isRunning)}>
					{metronome.isRunning ? 'Stop' : 'Start'}
				</button>

				{/* <button onClick={() => console.log(metronome)}>
							state data
						</button> */
				/* <button onClick={() => changeWorkerTest('start')}>
							start Worker Test
						</button>
						<button onClick={() => changeWorkerTest('stop')}>
							stop Worker Test
						</button> */}
			</div>

			<div className="settings-wrap">
				<div className="layers-settings">
					{metronome.layers.map((layer, i) => {
						return (
							<div className="setting" key={i}>
								<input
									type="number"
									name="numer-num"
									min="2"
									max="16"
									value={layer.beats}
									key={'number-' + i}
									onChange={e => changeLayerBeats(e, i)}
								/>
								<input
									type="range"
									name="numer-range"
									min="2"
									max="16"
									value={layer.beats}
									key={'numer-range-' + i}
									onChange={e => changeLayerBeats(e, i)}
								/>

								<span className="note">{Notes[layer.frequency][0]}</span>

								<input
									type="range"
									name="freq-range"
									key={'freq-range-' + i}
									min="0"
									max="10"
									value={layer.frequency}
									onChange={e => changeFrequency(e, i)}
								/>

								<button
									className="suppr-btn"
									onClick={e => updateLayer('remove', i)}
								>
									&times;
								</button>
							</div>
						)
					})}

					<div className="add-layer">
						<button onClick={() => updateLayer('add')}>add layer</button>
					</div>
				</div>

				<div className="global-settings">
					{/* <MoreSettings
						state={soundOptions}
						change={changeSoundOptions}
					/> */}

					<div className="setting tempo">
						<div>
							<h3>Tempo</h3>
							<button onClick={tapTempo}>tap</button>
						</div>

						<input
							type="range"
							name="tempo-range"
							id="tempo-range"
							min="20"
							max="300"
							value={metronome.tempo}
							onChange={e =>
								setMetronome(args => ({
									...args,
									tempo: +e.target.value,
								}))
							}
						/>
						<input
							type="number"
							name="tempo-num"
							id="tempo-num"
							min="20"
							max="300"
							value={metronome.tempo}
							onChange={e =>
								setMetronome(args => ({
									...args,
									tempo: +e.target.value,
								}))
							}
						/>
					</div>

					<div className="setting theme">
						<h3>Theme</h3>

						<select
							name="theme"
							id="theme"
							onChange={e =>
								setMoreSettings(prev => ({
									...prev,
									theme: e.target.value,
								}))
							}
						>
							<option value="lightgreen">lightgreen</option>
							<option value="dark">dark</option>
							<option value="deepdark">deepdark</option>
							<option value="coffee">coffee</option>
						</select>
					</div>

					<div className="setting display">
						<h3>Click display</h3>

						<button
							name="display"
							id="display"
							onClick={e =>
								setMoreSettings(prev => ({
									...prev,
									segment: {
										...prev.segment,
										on: moreSettings.segment.on ? false : true,
									},
								}))
							}
						>
							{moreSettings.segment.on ? 'segment' : 'layers'}
						</button>
					</div>
				</div>
			</div>
		</div>
	)
}

export default App
