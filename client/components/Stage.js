import React, { useEffect, useRef, useState, useInput } from "react";

const Stage = () => {
  
  // const useInput = ({ type, min, max, value, step = 1, id }) => {
  //   const [inputValue, setValue] = useState(value);
  //   const input = (
  //     <input
  //       type={type}
  //       min={min}
  //       max={max}
  //       value={inputValue}
  //       step={step}
  //       id={id}
  //       onChange={(event) => setValue(event.target.value)}
  //     />
  //   );
  //   return [inputValue, input];
  // };

  // const useLabel = (labelFor, text) => {
  //   return <label for={labelFor}>{text}</label>;
  // };




  // const volumeLabel = useLabel("volumeRange", "Volume");
  // const preampLabel = useLabel("preampDriveRange", "Pre-Amp Level");
  // const bassLabel = useLabel("bassRange", "Bass");
  // const midLabel = useLabel("midRange", "Mid");
  // const trebleLabel = useLabel("trebleRange", "Treble");
  // const driveLabel = useLabel("driveRange", "Overdrive");

  // const [volume, volumeInput] = useInput({
  //   type: "range",
  //   min: "0",
  //   max: "4",
  //   value: ".5",
  //   step: ".1",
  //   id: "volumeRange",
  // });

  // const [preampDriveValue, preampDriveInput] = useInput({
  //   type: "range",
  //   min: "0",
  //   max: "100",
  //   value: "48",
  //   step: "2",
  //   id: "preampDriveRange",
  // });
  // const [bassValue, bassInput] = useInput({
  //   type: "range",
  //   min: "-15",
  //   max: "9",
  //   value: "0",
  //   id: "bassRange",
  // });
  // const [midValue, midInput] = useInput({
  //   type: "range",
  //   min: "-10",
  //   max: "10",
  //   value: "0",
  //   id: "midRange",
  // });
  // const [trebleValue, trebleInput] = useInput({
  //   type: "range",
  //   min: "-10",
  //   max: "10",
  //   value: "0",
  //   id: "trebleRange",
  // });
  // const [driveValue, driveInput] = useInput({
  //   type: "range",
  //   min: "0",
  //   max: "150",
  //   value: "70",
  //   step: "5",
  //   id: "driveRange",
  // });
  
  // const volumeRef = useRef();
  // const bassRef = useRef();
  // const midRef = useRef();
  // const trebleRef = useRef();
  // const preampRef = useRef();
  // const driveRef = useRef();

  const [volumeValue, setVolumeValue] = useState('.5')
  const [preampDriveValue, setPreampDriveValue] = useState("48")
  const [bassValue, setBassValue] = useState('0')
  const [midValue, setMidValue] = useState('0')
  const [trebleValue, setTrebleValue] = useState('0')
  const [driveValue, setDriveValue] = useState('70')


  const context = new AudioContext();

  const gainNode = new GainNode(context, { gain: volumeValue.value });
  const compression = new GainNode(context, { gain: 1 });

  const preamp = context.createWaveShaper();
  const preampDrive = context.createWaveShaper();

  const bassEQ = new BiquadFilterNode(context, {
    type: "lowshelf",
    frequency: 500,
    gain: bassValue.value,
  });
  const midEQ = new BiquadFilterNode(context, {
    type: "peaking",
    Q: Math.SQRT1_2,
    frequency: 1500,
    gain: midValue.value,
  });
  const trebleEQ = new BiquadFilterNode(context, {
    type: "highshelf",
    frequency: 3000,
    gain: trebleValue.value,
  });

  const driveEQ = context.createWaveShaper();

  const makePreAmpCurve = () => {
    let curve = new Float32Array(44100),
      x;
    for (let i = 0; i < 44100; i++) {
      x = -1 + (2 * i) / 44100;
      curve[i] = (2 * x) / 1 + x ** 4;
    }
    return curve;
  };

  const pulseCurve = () => {
    let curve = new Float32Array(44100);
    for (let i = 0; i < 44100; i++) {
      let x = -1 + (2 * i) / 44100;
      curve[i] = Math.tanh(x);
    }
    return curve;
  };

  const makePreampDriveCurve = (amount) => {
    let k = typeof amount === "number" ? amount : 2,
      n_samples = 12050,
      curve = new Float32Array(n_samples),
      deg = Math.PI / 180,
      i = 0,
      x;
    for (; i < n_samples; ++i) {
      x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 15 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  const makeDriveCurve = (amount) => {
    let k = typeof amount === "number" ? amount : 2,
      n_samples = 44100,
      curve = new Float32Array(n_samples),
      deg = Math.PI / 180,
      i = 0,
      x;
    for (; i < n_samples; ++i) {
      x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 3 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  setupContext();

  async function setupContext(){
    const guitar = await getGuitar()
    if (context.state === 'suspended'){
      await context.resume();
    }
    const source = context.createMediaStreamSource(guitar);
    source
      .connect(compression)
      .connect(preamp)
      .connect(preampDrive)
      .connect(trebleEQ)
      .connect(bassEQ)
      .connect(midEQ)
      .connect(gainNode)
      .connect(driveEQ)
      .connect(context.destination)
  }

  function getGuitar(){
    return navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: false,
        autoGainControl: false,
        noiseSuppression: false,
        latency: 0,
      }
    });
  }

  const handleChangeVolume = (event) => {
    setVolumeValue(event.target.value);
    const value = parseFloat(event.target.value);
    gainNode.gain.setTargetAtTime(value, context.currentTime, .01);
  }
  const handleChangePreamp = (event) => {
    setPreampDriveValue(event.target.value);
    const value = parseInt(event.taret.value);
    preampDrive.curve = makePreampDriveCurve(value * 1);
    preampDrive.oversample = '4x';
  }
  const handleChangeBass = (event) => {
    setBassValue(event.target.value);
  }
  const handleChangeMid = (event) => {
    setMidValue(event.target.value);
  }
  const handleChangeTreble = (event) => {
    setTrebleValue(event.target.value);
  }
  const handleChangeDrive = (event) => {
    setDriveValue(event.target.value);
    const value = parseInt(event.target.value);
    driveEQ.curve = makeDriveCurve(value * 1);
    driveEQ.oversample = '1x';
  }

  return (
    <>
      <label htmlFor="volumeRange">Volume</label>
      <input type="range" min="0" max="4" value={volumeValue} step=".1" id="volumeRange" onChange={handleChangeVolume}></input>

      <label htmlFor="preampDriveRange">Pre-Amp</label>
      <input type="range" min="0" max="100" value={preampDriveValue} step="2" id="preampDriveRange" onChange={handleChangePreamp}></input>

      <label htmlFor="bassRange">Bass</label>
      <input type="range" min="-15" max="9" value={bassValue} id="bassRange" onChange={handleChangeBass}></input>

      <label htmlFor="midRange">Mid</label>
      <input type="range" min="-10" max="100" value={midValue} id="midRange" onChange={handleChangeMid}></input>

      <label htmlFor="trebleRange">Treble</label>
      <input type="range" min="-10" max="100" value={trebleValue} id="trebleRange" onChange={handleChangeTreble}></input>

      <label htmlFor="driveRange">Overdrive</label>
      <input type="range" min="0" max="150" value={driveValue} id="driveRange" onChange={handleChangeDrive}></input>
    </>
  );
};

export default Stage;