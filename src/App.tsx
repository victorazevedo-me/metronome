import { useRef, useState, useEffect, useCallback } from 'react'
import { MoreSettings, Layer, Sounds } from './Types'
import { isMobileOnly } from 'react-device-detect'
import Pizzicato from 'pizzicato'
import Settings from './settings/Settings'
import Clicks from './layers/Clicks'
import Tempo from './layers/Tempo'
import LayersTable from './layers/table/LayersTable'

const App = (): JSX.Element => {
	//
	// States & Values
	//

	const setRandomID = () => {
		let str = ''
		while (str.length < 8) str += String.fromCharCode(Math.random() * (122 - 97) + 97)
		return str
	}

	const [times, setTimes] = useState<number[]>([1, 1])
	const [tempo, setTempo] = useState(80)
	const [startTime, setStartTime] = useState(Date.now)
	const [isRunning, setIsRunning] = useState('')
	const [easy, setEasy] = useState(true)

	const [segment, setSegment] = useState({
		on: false,
		count: 0,
		ratios: [0],
		duplicates: [0],
		dupCount: 1,
	})

	const [moreSettings, setMoreSettings] = useState<MoreSettings>({
		theme: 2,
		fullscreen: false,
		unlimited: false,
		animations: true,
		all: false,
	})

	const [layers, setLayers] = useState<Layer[]>([
		{
			id: setRandomID(),
			beats: 4,
			freq: {
				wave: 12,
				wood: 0,
				drum: 1,
			},
			release: false,
			duration: false,
			type: 'sine',
			volume: 0.4,
		},
		{
			id: setRandomID(),
			beats: 5,
			freq: {
				wave: 15,
				wood: 1,
				drum: 0,
			},
			release: false,
			duration: false,
			type: 'sine',
			volume: 0.3,
		},
	])

	const [sounds, setSounds] = useState<Sounds>()

	const timesRef = useRef(times)
	const tempoRef = useRef(tempo)
	const startTimeRef = useRef(startTime)
	const isRunningRef = useRef(isRunning)
	const segmentRef = useRef(segment)
	const moreSettingsRef = useRef(moreSettings)
	const layersRef = useRef(layers)
	const IsTypingRef = useRef(false)

	timesRef.current = times
	tempoRef.current = tempo
	startTimeRef.current = startTime
	isRunningRef.current = isRunning
	layersRef.current = layers
	segmentRef.current = segment
	moreSettingsRef.current = moreSettings

	//
	//
	// Main functions
	//
	//

	function metronomeInterval(
		fixedTempoMs: number,
		nextDelay: number,
		index: number,
		runId: string
	) {
		const m_timeout = window.setTimeout(() => {
			//
			// Short name for refs
			const layer = layersRef.current[index]
			const innerTimes = [...timesRef.current]

			// Quit recursion if stopped or removed
			if (isRunningRef.current !== runId || layer === undefined) {
				clearTimeout(m_timeout)
				return
			}

			//
			// Segment count, if on
			//

			if (segmentRef.current.on) {
				const currSeg = segmentRef.current

				// If there are duplicates, do nothing but count duplicates
				if (currSeg.dupCount < currSeg.duplicates[currSeg.count]) currSeg.dupCount++
				else {
					// Reset duplicate count
					// Check for layers.time to know what currSeg should do
					currSeg.dupCount = 1
					const allAtOne = innerTimes.every(t => t === 1)
					const oneAtMax = innerTimes[index] === layer.beats
					currSeg.count = allAtOne ? 1 : oneAtMax ? 0 : currSeg.count + 1
				}

				setSegment({ ...currSeg })
			}

			//
			// Play sound
			//

			if (layer.type === 'sine' || layer.type === 'triangle') {
				const note = layer.freq.wave + 12
				const freq = 32.7 * 2 ** (note / 12)
				const wave = new Pizzicato.Sound({
					source: 'wave',
					options: {
						type: layer.type,
						volume: layer.volume,
						frequency: freq,
						attack: 0,
						release: layer.release ? 0.6 : null,
					},
				})

				wave.play()
				setTimeout(() => wave.stop(), layer.duration ? fixedTempoMs * 0.3 : 50)
			} else {
				if (sounds) {
					const freq = layer.freq[layer.type]
					const audio = new Audio(sounds[layer.type][freq].default)

					audio.volume = layer.volume
					audio.play()
				}
			}

			//
			// Update beat time
			// Return to 1 if 'time' above 'beats'
			//

			innerTimes[index] = innerTimes[index] >= layer.beats ? 1 : innerTimes[index] + 1
			setTimes([...innerTimes])

			// Calculate latency
			const start = startTimeRef.current
			const latencyOffset = start > 0 ? (Date.now() - start) % fixedTempoMs : 0

			// Recursion
			metronomeInterval(fixedTempoMs, fixedTempoMs - latencyOffset, index, runId)
		}, nextDelay)
	}

	const startMetronome = () => {
		const calculateTempoMs = (beats: number, tmp: number) => {
			tmp = tmp < 30 ? 30 : tmp > 300 ? 300 : tmp
			return 60000 / ((beats / 4) * tmp)
		}

		const runId = setRandomID()
		setTimes(times.map(x => (x = 1)))

		layersRef.current.forEach((l, i) => {
			const tempoMs = calculateTempoMs(l.beats, tempoRef.current)
			metronomeInterval(tempoMs, tempoMs, i, runId)
		})

		// Update to start state
		setStartTime(Date.now())
		setIsRunning(runId)
	}

	const stopMetronome = () => {
		setSegment({ ...segment, count: 0 })
		setIsRunning('')
		setStartTime(0)
	}

	const restartMetronome = () => {
		if (isRunning !== '') {
			setSegment({ ...segment, count: 0 })
			startMetronome()
		}
	}

	const updateLayer = (add: boolean) => {
		const newLayers = [...layers]
		const newTimes = times
		const notes = [16, 19, 24]
		const beats = [5, 7, 10]

		if (!add && newLayers.length > 1) {
			newLayers.splice(-1, 1)
			newTimes.pop()
		}

		if (add && newLayers.length < 4) {
			newLayers.push({
				id: setRandomID(),
				beats: beats[newLayers.length - 1],
				freq: {
					wave: notes[newLayers.length - 1],
					wood: 0,
					drum: 1,
				},
				release: false,
				duration: false,
				type: 'sine',
				volume: 0.4,
			})
			newTimes.push(0)
		}

		// Update
		setLayers([...newLayers])
		setTimes([...newTimes])
		setTimeout(() => restartMetronome(), 20)
	}

	const initSegment = useCallback(() => {
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
			list = [0, ...new Set(list), 1]
			const ratios: number[] = []

			// segment ratio [next - current]
			list.forEach((elem, i) => {
				if (list[i + 1]) ratios.push(list[i + 1] - elem)
			})

			return ratios
		}

		const division: number[] = []

		// Fill with all layers divisions & sort
		layers.forEach(layer => {
			for (let k = 1; k < layer.beats; k++) division.push(k / layer.beats)
		})
		division.sort()

		setSegment({
			...segment,
			ratios: getRatios(division),
			duplicates: getDuplicates(division),
		})
	}, [layers, segment])

	//
	//
	//	Effects
	//
	//

	useEffect(() => {
		document.addEventListener('keydown', (e: KeyboardEvent) => {
			//
			// Lose focus before firing
			if (document.activeElement) {
				const el = document.activeElement as HTMLButtonElement
				el.blur()
			}

			// Spacebar control metronome
			if (e.code === 'Space' && !IsTypingRef.current)
				isRunningRef.current ? stopMetronome() : startMetronome()

			// Tempo up by 10 if shift
			if (e.code === 'ArrowUp') setTempo(tempoRef.current + (e.shiftKey ? 10 : 1))

			// Tempo down by 10 if shift
			if (e.code === 'ArrowDown') setTempo(tempoRef.current - (e.shiftKey ? 10 : 1))

			e.stopPropagation()
			return false
		})

		// Wake from sleep (if you have slept)
		if (localStorage.sleep) {
			//applySaved(JSON.parse(localStorage.sleep))
		}

		// Updates fullscreen if left by something else than toggle
		document.onfullscreenchange = () => {
			if (document.fullscreenElement === null)
				setMoreSettings(prev => ({
					...prev,
					fullscreen: false,
				}))
		}

		//Init sounds requires
		setSounds(require('./Sounds').default)

		// eslint-disable-next-line
	}, [])

	useEffect(() => {
		if (segment.on) initSegment()
		// eslint-disable-next-line
	}, [layers, segment.on])

	//
	//
	//
	//
	//

	return (
		<div
			className={'polytronome' + (isMobileOnly ? ' mobile' : '') + (easy ? ' easy' : '')}
		>
			<main>
				<div className="title">
					<p>Train your polyrythms</p>
					<h1>Polytronome</h1>
				</div>

				<Clicks times={times} layers={layers} segment={segment}></Clicks>

				<LayersTable
					easy={easy}
					layers={layers}
					setLayers={setLayers}
					updateLayer={updateLayer}
					restartMetronome={restartMetronome}
				></LayersTable>

				<div className="tempo-n-start">
					<Tempo
						restart={restartMetronome}
						tempo={tempo}
						setTempo={setTempo}
						tempoRef={tempoRef}
					></Tempo>

					<div className="start-button">
						<button
							onClick={() => (isRunning ? stopMetronome() : startMetronome())}
						>
							{isRunning ? 'Stop' : 'Start'}
						</button>
					</div>
				</div>
			</main>

			<div className="bottom">
				<div className="links">
					<a href="https://docs.polytronome.com">about & docs</a>
					<a href="https://victr.me">created by victr</a>
				</div>
				<div>
					<Settings
						easy={easy}
						segment={segment}
						moreSettings={moreSettings}
						setMoreSettings={setMoreSettings}
						setSegment={setSegment}
						setEasy={setEasy}
					></Settings>
				</div>
			</div>
		</div>
	)
}

export default App
