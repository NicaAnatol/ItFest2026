'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { building as defaultBuilding, patients as defaultPatients, getPatientLocationAtTime } from '@/lib/simulation/data/buildingData';
import { generateCustomBuilding, getDefaultBuilding } from '@/lib/simulation/utils/buildingGenerator';
import IsometricFloorView from '@/components/simulation/IsometricFloorView';
import IsometricCityView from '@/components/simulation/IsometricCityView';
import TimeSimulator from '@/components/simulation/TimeSimulator';
import DetailedAnalytics from '@/components/simulation/DetailedAnalytics';
import StatisticsPanel from '@/components/simulation/StatisticsPanel';
import SimulationSetup from '@/components/simulation/SimulationSetup';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Patient, Building, Department } from '@/lib/simulation/types/building';
import { QueueManager } from '@/lib/simulation/data/queueManagerClass';
import { SimulationPrecomputer } from '@/lib/simulation/utils/simulationPrecompute';
import { SimulationConfig } from '@/lib/simulation/types/simulationConfig';
import { generatePatientsFromConfig } from '@/lib/simulation/utils/advancedPatientGenerator';
import { checkPatientTransferNeed, checkNextVisitTransferNeed, initiatePatientTransfer, updateTransferProgress, reassignPatientVisits, calculateHospitalDistance, calculateTransferDuration, calculateTransferMortality } from '@/lib/simulation/utils/patientTransfer';

export default function SimulationPage() {
  // Setup mode state
  const [isInSetupMode, setIsInSetupMode] = useState(true);
  const [selectedFloor, setSelectedFloor] = useState(0);
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);
  const [isStatsPanelOpen, setIsStatsPanelOpen] = useState(false);
  const [isAnalyticsPanelOpen, setIsAnalyticsPanelOpen] = useState(false);

  // City view state
  const [viewMode, setViewMode] = useState<'city' | 'hospital'>('hospital');
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);
  const [cityHospitals, setCityHospitals] = useState<Array<{ id: string; name: string; building: Building; position: { x: number; y: number } }>>([]);

  // Dynamic building state
  const [currentBuilding, setCurrentBuilding] = useState<Building>(defaultBuilding);

  // Time simulation state
  const [currentTime, setCurrentTime] = useState('08:00');
  const [currentDay, setCurrentDay] = useState('Monday');
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(5);
  const [currentSeconds, setCurrentSeconds] = useState(0);

  // Stress test patients (if loaded)
  const [stressTestPatients, setStressTestPatients] = useState<Patient[] | null>(null);
  const [stressTestCapacities, setStressTestCapacities] = useState<{ [deptId: string]: { capacity: number; processingTimeMinutes: number } } | null>(null);
  const [isStressTestMode, setIsStressTestMode] = useState(false);
  const [simulationStartTime, setSimulationStartTime] = useState('08:00');
  const [simulationEndTime, setSimulationEndTime] = useState('20:00');
  const queueManagerRef = useRef<QueueManager | null>(null);
  const [queueUpdateTrigger, setQueueUpdateTrigger] = useState(0);

  // PRE-COMPUTATION for instant timeline navigation
  const precomputerRef = useRef<SimulationPrecomputer | null>(null);
  const [isPrecomputing, setIsPrecomputing] = useState(false);
  const [precomputeProgress, setPrecomputeProgress] = useState(0);
  const [isPrecomputeReady, setIsPrecomputeReady] = useState(false);

  // PER-HOSPITAL simulation data with transfer stats
  const hospitalSimulationsRef = useRef<Map<string, {
    patients: Patient[];
    capacities: { [deptId: string]: { capacity: number; processingTimeMinutes: number } };
    queueManager: QueueManager;
    precomputer: SimulationPrecomputer;
    isReady: boolean;
    transferStats: {
      patientsTransferredOut: number;  // Left this hospital
      patientsTransferredIn: number;   // Came to this hospital
      patientsServed: number;          // Successfully treated (did not leave)
    };
  }>>(new Map());

  // Transfer animation state - STORE ALL TRANSFERS, calculate active ones dynamically
  const allTransfersRef = useRef<Array<{
    patientId: string;
    patientName: string;
    patientData: Patient; // Full patient object with all data
    fromHospitalId: string;
    toHospitalId: string;
    startTime: string;
    durationMinutes: number;
    distance?: number;
    reason?: string;
  }>>([]);

  const lastTransferCheckRef = useRef<number>(0);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const [cityCamera, setCityCamera] = useState({ x: 0, y: 0, zoom: 1 });

  // Track completed transfers
  const completedTransfersRef = useRef<Array<{
    patientId: string;
    patientName: string;
    fromHospital: string;
    toHospital: string;
    reason: string;
    time: string;
    startTime?: string; // Time when transfer started
    distance?: number;
    durationMinutes?: number;
  }>>([]);

  // Use stress test patients if available, otherwise default
  // For city mode, use the selected hospital's patients
  const patients = useMemo(() => {
    if (isStressTestMode && cityHospitals.length > 0 && selectedHospitalId) {
      const hospitalSim = hospitalSimulationsRef.current.get(selectedHospitalId);
      return hospitalSim?.patients || defaultPatients;
    }
    return isStressTestMode && stressTestPatients ? stressTestPatients : defaultPatients;
  }, [isStressTestMode, stressTestPatients, cityHospitals, selectedHospitalId]);

  const currentFloor = currentBuilding.floors[selectedFloor];

  // Calculate ACTIVE transfers dynamically based on current time (like internal hospital movements)
  const transferringPatients = useMemo(() => {
    const [hours, minutes] = currentTime.split(':').map(Number);
    const currTimeSeconds = (hours * 60 + minutes) * 60 + currentSeconds;

    return allTransfersRef.current
      .filter(transfer => {
        const [startH, startM] = transfer.startTime.split(':').map(Number);
        const transferStartSeconds = (startH * 60 + startM) * 60;
        const transferDurationSeconds = transfer.durationMinutes * 60;
        const transferEndSeconds = transferStartSeconds + transferDurationSeconds;

        // Include only transfers happening NOW
        return currTimeSeconds >= transferStartSeconds && currTimeSeconds <= transferEndSeconds;
      })
      .map(transfer => ({
        ...transfer.patientData,
        isTransferring: true,
        transferTo: transfer.toHospitalId,
        transferStartTime: transfer.startTime,
        transferDurationMinutes: transfer.durationMinutes,
        transferDistance: transfer.distance,
        transferReason: transfer.reason,
        currentHospitalId: transfer.fromHospitalId,
      }));
  }, [currentTime, currentSeconds]);

  // Helper function to get department by ID from current building
  const getDeptById = (id: string) => {
    for (const floor of currentBuilding.floors) {
      const dept = floor.departments.find(d => d.id === id);
      if (dept) return dept;
    }
    return undefined;
  };

  // Helper function to get patients in department
  const getPatientsInDept = (departmentId: string, time: string, day: string) => {
    const [hours, minutes] = time.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;

    return patients.filter((patient) => {
      return patient.visits.some((visit) => {
        if (visit.day !== day || visit.departmentId !== departmentId) return false;

        const [startH, startM] = visit.startTime.split(':').map(Number);
        const [endH, endM] = visit.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;

        return currentMinutes >= startMinutes && currentMinutes < endMinutes;
      });
    });
  };

  // Handle department click
  const handleDepartmentClick = (deptId: string) => {
    setSelectedDepartment(deptId);
  };

  // Handle loading stress test patients
  const handleLoadStressTest = async (
    stressPatients: Patient[],
    capacities: { [deptId: string]: { capacity: number; processingTimeMinutes: number } },
    startTime?: string,
    endTime?: string
  ) => {
    const simStartTime = startTime || '08:00';
    const simEndTime = endTime || '20:00';

    setStressTestPatients(stressPatients);
    setStressTestCapacities(capacities);
    setIsStressTestMode(true);
    setSimulationStartTime(simStartTime);
    setSimulationEndTime(simEndTime);
    setCurrentTime(simStartTime);
    setCurrentSeconds(0);
    setIsPlaying(false);
    setCurrentDay('Test Day');
    setIsInSetupMode(false);

    // Initialize QueueManager
    queueManagerRef.current = new QueueManager(capacities);

    // Start PRE-COMPUTATION
    setIsPrecomputing(true);
    setPrecomputeProgress(0);
    setIsPrecomputeReady(false);

    // Get all department IDs
    const deptIds = currentBuilding.floors.flatMap(f => f.departments.map(d => d.id));

    const precomputer = new SimulationPrecomputer(stressPatients, 'Test Day', capacities, deptIds);
    precomputerRef.current = precomputer;

    // Parse start/end times to minutes
    const [startH, startM] = simStartTime.split(':').map(Number);
    const [endH, endM] = simEndTime.split(':').map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Pre-compute from 1 hour before start to end time
    const precomputeStart = Math.max(0, startMinutes - 60);
    const precomputeEnd = endMinutes;

    try {
      await precomputer.precomputeAllStates(
        precomputeStart,
        precomputeEnd,
        (percent) => {
          setPrecomputeProgress(percent);
        }
      );

      setIsPrecomputeReady(true);
      setIsPrecomputing(false);

      // Load initial state at start time
      const initialState = precomputer.getStateAtTime(simStartTime);
      if (initialState && queueManagerRef.current) {
        queueManagerRef.current.importState(initialState.queueState);
        setQueueUpdateTrigger(prev => prev + 1);
      }
    } catch (error) {
      console.error('Pre-computation failed:', error);
      setIsPrecomputing(false);
      setIsPrecomputeReady(false);
    }
  };

  // Handle starting simulation from config
  const handleStartSimulation = async (config: SimulationConfig) => {
    // Check if city mode is enabled
    if (config.cityConfig?.enabled && config.cityConfig.hospitals.length > 0) {
      console.log('🏙️ CITY MODE: Generating separate simulations for each hospital');

      // Generate buildings for each hospital
      const hospitals = config.cityConfig.hospitals.map((hospitalConfig, index) => {
        let hospitalBuilding: Building;

        if (hospitalConfig.customBuilding?.enabled && hospitalConfig.customBuilding.floors.length > 0) {
          hospitalBuilding = generateCustomBuilding(
            hospitalConfig.customBuilding.floors,
            hospitalConfig.customBuilding.floorCount
          );
        } else if (config.customBuilding?.enabled && config.customBuilding.floors.length > 0) {
          hospitalBuilding = generateCustomBuilding(
            config.customBuilding.floors,
            config.customBuilding.floorCount
          );
        } else {
          hospitalBuilding = getDefaultBuilding();
        }

        // Auto-position hospitals in grid
        const COLS = 3;
        const HOSPITAL_SPACING_X = 700;
        const HOSPITAL_SPACING_Y = 500;
        const col = index % COLS;
        const row = Math.floor(index / COLS);

        return {
          id: hospitalConfig.id,
          name: hospitalConfig.name,
          building: hospitalBuilding,
          position: {
            x: col * HOSPITAL_SPACING_X + 50,
            y: row * HOSPITAL_SPACING_Y + 50
          }
        };
      });

      setCityHospitals(hospitals);
      setViewMode('city');
      setSelectedHospitalId(hospitals[0]?.id || null);
      setCurrentBuilding(hospitals[0]?.building || getDefaultBuilding());
      setSelectedFloor(0);

      // Generate SEPARATE simulations for each hospital
      setIsPrecomputing(true);
      setIsPrecomputeReady(false);
      hospitalSimulationsRef.current.clear();

      let totalProgress = 0;
      const hospitalsCount = config.cityConfig.hospitals.length;

      for (let i = 0; i < config.cityConfig.hospitals.length; i++) {
        const hospitalConfig = config.cityConfig.hospitals[i];
        const hospital = hospitals[i];

        console.log(`\n🏥 Generating simulation for ${hospital.name}...`);
        console.log(`   Patients: ${hospitalConfig.simulationConfig.totalPatients}`);
        console.log(`   Departments available: ${hospital.building.floors.flatMap(f => f.departments.map(d => d.type)).join(', ')}`);

        // Generate patients specifically for THIS hospital
        const hospitalPatients = generatePatientsFromConfig(hospitalConfig.simulationConfig);

        // Get available department types in THIS hospital
        const availableDeptTypes = new Set(
          hospital.building.floors.flatMap(f => f.departments.map(d => d.type))
        );

        const availableDeptIds = new Set(
          hospital.building.floors.flatMap(f => f.departments.map(d => d.id))
        );

        console.log(`   Available department types: ${Array.from(availableDeptTypes).join(', ')}`);

        // ADD ALL PATIENTS to hospital (don't filter)
        // We'll handle transfers during simulation when they need unavailable departments
        hospitalPatients.forEach(patient => {
          patient.currentHospitalId = hospital.id;
        });

        console.log(`   📋 Total patients assigned: ${hospitalPatients.length}`);

        // Get capacities for THIS hospital
        const capacities: { [deptId: string]: { capacity: number; processingTimeMinutes: number } } = {};
        hospitalConfig.simulationConfig.departmentCapacities.forEach(dept => {
          capacities[dept.departmentId] = {
            capacity: dept.capacity,
            processingTimeMinutes: dept.processingTimeMinutes
          };
        });

        // Create QueueManager for THIS hospital
        const queueManager = new QueueManager(capacities);

        // Get all department IDs for THIS hospital
        const deptIds = hospital.building.floors.flatMap(f => f.departments.map(d => d.id));

        // Create SimulationPrecomputer for THIS hospital
        const precomputer = new SimulationPrecomputer(
          hospitalPatients,
          hospitalConfig.simulationConfig.simulationDay,
          capacities,
          deptIds
        );

        // Parse start/end times
        const [startH, startM] = hospitalConfig.simulationConfig.startTime.split(':').map(Number);
        const [endH, endM] = hospitalConfig.simulationConfig.endTime.split(':').map(Number);
        const startMinutes = startH * 60 + startM;
        const endMinutes = endH * 60 + endM;
        const precomputeStart = Math.max(0, startMinutes - 60);
        const precomputeEnd = endMinutes;

        // Pre-compute for THIS hospital
        await precomputer.precomputeAllStates(
          precomputeStart,
          precomputeEnd,
          (percent) => {
            const hospitalProgress = percent / hospitalsCount;
            const overallProgress = totalProgress + hospitalProgress;
            setPrecomputeProgress(overallProgress);
          }
        );

        totalProgress += (100 / hospitalsCount);

        // Load initial state
        const initialState = precomputer.getStateAtTime(hospitalConfig.simulationConfig.startTime);
        if (initialState) {
          queueManager.importState(initialState.queueState);
        }

        // Store simulation data for THIS hospital
        hospitalSimulationsRef.current.set(hospital.id, {
          patients: hospitalPatients,
          capacities,
          queueManager,
          precomputer,
          isReady: true,
          transferStats: {
            patientsTransferredOut: 0,
            patientsTransferredIn: 0,
            patientsServed: 0
          }
        });

        console.log(`✅ ${hospital.name} simulation ready (${hospitalPatients.length} patients)`);
      }

      // Don't pre-redistribute patients - let them enter hospitals and transfer during simulation


      setIsPrecomputing(false);
      setIsPrecomputeReady(true);
      setIsStressTestMode(true);
      setSimulationStartTime(config.startTime);
      setSimulationEndTime(config.endTime);
      setCurrentTime(config.startTime);
      setCurrentSeconds(0);
      setIsPlaying(false);
      setCurrentDay(config.simulationDay);
      setIsInSetupMode(false);

      // Load first hospital's simulation
      const firstHospitalSim = hospitalSimulationsRef.current.get(hospitals[0].id);
      if (firstHospitalSim) {
        queueManagerRef.current = firstHospitalSim.queueManager;
        precomputerRef.current = firstHospitalSim.precomputer;
        setQueueUpdateTrigger(prev => prev + 1);
      }

      console.log(`\n✅ ALL HOSPITALS READY - ${hospitalsCount} separate simulations loaded`);
    } else {
      // Single hospital mode (existing logic)
      setViewMode('hospital');
      setCityHospitals([]);

      // Generate custom building if enabled
      if (config.customBuilding?.enabled && config.customBuilding.floors.length > 0) {
        const customBuilding = generateCustomBuilding(
          config.customBuilding.floors,
          config.customBuilding.floorCount
        );
        setCurrentBuilding(customBuilding);
        setSelectedFloor(0);
      } else {
        setCurrentBuilding(getDefaultBuilding());
      }

      // Generate patients from config
      const generatedPatients = generatePatientsFromConfig(config);

      // Convert department capacities to the format expected
      const capacities: { [deptId: string]: { capacity: number; processingTimeMinutes: number } } = {};

      config.departmentCapacities.forEach(dept => {
        capacities[dept.departmentId] = {
          capacity: dept.capacity,
          processingTimeMinutes: dept.processingTimeMinutes
        };
      });

      // Load into simulation with time range
      await handleLoadStressTest(generatedPatients, capacities, config.startTime, config.endTime);
      setCurrentDay(config.simulationDay);
      setCurrentTime(config.startTime);
    }
  };

  // Reset to default patients
  const handleResetToDefault = () => {
    setIsStressTestMode(false);
    setStressTestPatients(null);
    setStressTestCapacities(null);
    queueManagerRef.current = null;
    precomputerRef.current?.clear();
    precomputerRef.current = null;
    setIsPrecomputeReady(false);
    setIsPrecomputing(false);
    setCurrentTime('08:00');
    setCurrentSeconds(0);
    setCurrentDay('Monday');
    setIsInSetupMode(true);
  };

  // Get entrance/exit stats
  let patientsEntered = 0;
  let patientsExited = 0;

  if (isStressTestMode && isPrecomputeReady && precomputerRef.current) {
    const state = precomputerRef.current.getStateAtTime(currentTime);
    if (state) {
      patientsEntered = state.stats.totalEntered;
      patientsExited = state.stats.totalExited;
    }
  }

  // Switch to selected hospital's simulation when hospital changes
  useEffect(() => {
    if (cityHospitals.length > 0 && selectedHospitalId && isStressTestMode) {
      const hospitalSim = hospitalSimulationsRef.current.get(selectedHospitalId);
      if (hospitalSim && hospitalSim.isReady) {
        console.log(`🔄 Switching to ${cityHospitals.find(h => h.id === selectedHospitalId)?.name} simulation`);
        queueManagerRef.current = hospitalSim.queueManager;
        precomputerRef.current = hospitalSim.precomputer;
        setStressTestCapacities(hospitalSim.capacities);

        // Load state at current time
        const state = hospitalSim.precomputer.getStateAtTime(currentTime);
        if (state) {
          hospitalSim.queueManager.importState(state.queueState);
        }

        setQueueUpdateTrigger(prev => prev + 1);
      }
    }
  }, [selectedHospitalId, cityHospitals, isStressTestMode, currentTime]);

  // PRE-CALCULATE or LOOKUP department occupancies
  const departmentOccupancies = useMemo(() => {
    if (isStressTestMode && isPrecomputeReady && precomputerRef.current) {
      const state = precomputerRef.current.getStateAtTime(currentTime);
      return state?.departmentOccupancies || new Map();
    }

    const occupancies = new Map<string, {
      occupied: number;
      capacity: number;
      isBlocked: boolean;
      queueLength: number;
    }>();

    currentFloor.departments.forEach((dept) => {
      if (isStressTestMode && queueManagerRef.current) {
        const queueState = queueManagerRef.current.getQueueState(dept.id);
        if (queueState) {
          occupancies.set(dept.id, {
            occupied: queueState.currentOccupancy,
            capacity: queueState.capacity,
            isBlocked: queueState.isBlocked,
            queueLength: queueState.queue.length,
          });
        }
      } else {
        const patientsInDept = getPatientsInDept(dept.id, currentTime, currentDay);
        const capacity = stressTestCapacities?.[dept.id]?.capacity ?? dept.capacity ?? 10;
        occupancies.set(dept.id, {
          occupied: patientsInDept.length,
          capacity,
          isBlocked: patientsInDept.length >= capacity,
          queueLength: 0,
        });
      }
    });

    return occupancies;
  }, [currentFloor, currentTime, currentDay, isStressTestMode, isPrecomputeReady, stressTestCapacities, queueUpdateTrigger]);

  // INSTANT STATE LOAD: Load precomputed state when time changes
  useEffect(() => {
    if (!isStressTestMode || !isPrecomputeReady || !precomputerRef.current || !queueManagerRef.current) {
      return;
    }

    const state = precomputerRef.current.getStateAtTime(currentTime);

    if (state) {
      queueManagerRef.current.importState(state.queueState);
      setQueueUpdateTrigger(prev => prev + 1);
    }
  }, [currentTime, isStressTestMode, isPrecomputeReady]);

  // CHECK FOR PATIENT TRANSFERS between hospitals in city mode
  useEffect(() => {
    if (!isStressTestMode || !isPrecomputeReady || cityHospitals.length < 2) {
      return;
    }

    // Check every 1 minute of simulation time (more frequent)
    const [hours, minutes] = currentTime.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;

    // Detect time going backwards (scrubbing) - reset last check
    if (currentMinutes < lastTransferCheckRef.current) {
      console.log(`   ⏪ Time went backwards: ${lastTransferCheckRef.current} → ${currentMinutes}, resetting transfer check`);
      lastTransferCheckRef.current = -1; // Force recheck
    }

    if (currentMinutes - lastTransferCheckRef.current < 1) {
      return;
    }

    lastTransferCheckRef.current = currentMinutes;

    // Check all patients across all hospitals for transfer needs
    const transfers: Patient[] = [];

    console.log(`\n⏰ [${currentTime}] Checking transfers across ${cityHospitals.length} hospitals...`);

    // Get current transferring patient IDs to avoid duplicates
    const currentlyTransferringIds = new Set(transferringPatients.map(p => p.id));

    hospitalSimulationsRef.current.forEach((hospitalSim, hospitalId) => {
      const hospital = cityHospitals.find(h => h.id === hospitalId);
      if (!hospital) return;

      // Build hospital data with departments AND position for transfer logic
      const hospitalData = {
        id: hospital.id,
        name: hospital.name,
        departments: hospital.building.floors.flatMap(f => f.departments),
        position: hospital.position
      };

      const allHospitalsData = cityHospitals.map(h => ({
        id: h.id,
        name: h.name,
        departments: h.building.floors.flatMap(f => f.departments),
        position: h.position
      }));

      console.log(`   🏥 ${hospital.name}: ${hospitalSim.patients.length} patients, ${hospitalData.departments.length} departments`);
      console.log(`      Department types: ${[...new Set(hospitalData.departments.map(d => d.type))].join(', ')}`);

      // Check each patient in this hospital
      let patientsChecked = 0;
      let transfersNeeded = 0;

      hospitalSim.patients.forEach(patient => {
        // Skip if already transferring or dead
        if (patient.isTransferring || patient.isDead) return;

        // IMPORTANT: Skip if already in the transferring list (avoid duplicates)
        if (currentlyTransferringIds.has(patient.id)) {
          return;
        }

        patientsChecked++;

        // Check if NEXT visit needs transfer (not all visits)
        const transferDecision = checkNextVisitTransferNeed(patient, hospitalData, allHospitalsData, currentTime);

        if (transferDecision.shouldTransfer && transferDecision.targetHospitalId) {
          transfersNeeded++;
          const targetHospital = cityHospitals.find(h => h.id === transferDecision.targetHospitalId);

          console.log(`      🚑 TRANSFER NEEDED: ${patient.name}`);
          console.log(`         → From: ${hospital.name} to ${targetHospital?.name}`);
          console.log(`         → Reason: ${transferDecision.reason}`);
          console.log(`         → Distance: ${transferDecision.distance?.toFixed(1)}km, Duration: ${transferDecision.estimatedDurationMinutes}min`);

          // Update source hospital stats - patient is leaving
          const sourceHospitalSim = hospitalSimulationsRef.current.get(hospital.id);
          if (sourceHospitalSim) {
            sourceHospitalSim.transferStats.patientsTransferredOut++;
          }

          const transferredPatient = initiatePatientTransfer(
            patient,
            transferDecision.targetHospitalId,
            transferDecision.reason || '',
            transferDecision.distance,
            transferDecision.estimatedDurationMinutes,
            currentTime
          );

          transfers.push(transferredPatient);
        }
      });

      console.log(`      ✓ Checked ${patientsChecked} patients, ${transfersNeeded} need transfer`);
    });

    console.log(`   📊 Total transfers initiated: ${transfers.length}\n`);

    if (transfers.length > 0) {
      // Check if these transfers already exist in allTransfersRef
      // Use composite key (patientId + startTime) to allow same patient multiple transfers
      const existingTransferKeys = new Set(allTransfersRef.current.map(t =>
        `${t.patientId}-${t.startTime}`
      ));

      transfers.forEach(transfer => {
        const transferKey = `${transfer.id}-${transfer.transferStartTime || currentTime}`;

        // Only add if not already in the list
        if (!existingTransferKeys.has(transferKey)) {
          allTransfersRef.current.push({
            patientId: transfer.id,
            patientName: transfer.name,
            patientData: transfer,
            fromHospitalId: transfer.currentHospitalId || '',
            toHospitalId: transfer.transferTo || '',
            startTime: transfer.transferStartTime || currentTime,
            durationMinutes: transfer.transferDurationMinutes || 5,
            distance: transfer.transferDistance,
            reason: transfer.transferReason,
          });
          console.log(`   ➕ Added transfer: ${transfer.name} (${transfer.id}) at ${transfer.transferStartTime || currentTime}`);
        }
      });
    }
  }, [currentTime, isStressTestMode, isPrecomputeReady, cityHospitals, currentDay]);

  // PROCESS COMPLETED TRANSFERS - check at each time point (LIKE INTERNAL HOSPITAL MOVEMENTS)
  useEffect(() => {
    if (!isStressTestMode || cityHospitals.length < 2) return;

    const [hours, minutes] = currentTime.split(':').map(Number);
    const currentMinutes = hours * 60 + minutes;
    const currTimeSeconds = (hours * 60 + minutes) * 60 + currentSeconds;

    // Find transfers that should be completed by now
    allTransfersRef.current.forEach(transfer => {
      const [startH, startM] = transfer.startTime.split(':').map(Number);
      const transferStartSeconds = (startH * 60 + startM) * 60;
      const transferDurationSeconds = transfer.durationMinutes * 60;
      const transferEndSeconds = transferStartSeconds + transferDurationSeconds;

      // Check if transfer is complete but not yet processed
      if (currTimeSeconds >= transferEndSeconds) {
        // Check if already in completedTransfers (using composite key)
        const alreadyCompleted = completedTransfersRef.current.some(
          t => t.patientId === transfer.patientId &&
               t.fromHospital === (cityHospitals.find(h => h.id === transfer.fromHospitalId)?.name) &&
               t.startTime === transfer.startTime
        );

        if (!alreadyCompleted) {
          const patient = transfer.patientData;
          const fromHospital = hospitalSimulationsRef.current.get(transfer.fromHospitalId);
          const targetHospitalData = cityHospitals.find(h => h.id === transfer.toHospitalId);
          const sourceHospitalData = cityHospitals.find(h => h.id === transfer.fromHospitalId);

          // Calculate end time
          const endMinutes = Math.floor(transferEndSeconds / 60);
          const endH = Math.floor(endMinutes / 60);
          const endM = endMinutes % 60;
          const endTime = `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;

          // Check if leaving system
          if (transfer.toHospitalId === 'OUTSIDE_SYSTEM') {
            if (fromHospital) {
              fromHospital.patients = fromHospital.patients.filter(p => p.id !== patient.id);
              console.log(`🌍 ${patient.name} left the system from ${sourceHospitalData?.name}`);
            }

            completedTransfersRef.current.push({
              patientId: patient.id,
              patientName: patient.name,
              fromHospital: sourceHospitalData?.name || 'Unknown',
              toHospital: 'ABROAD',
              reason: transfer.reason || 'Department unavailable',
              time: endTime,
              startTime: transfer.startTime,
              distance: 0,
              durationMinutes: transfer.durationMinutes
            });
            return;
          }

          // Normal transfer
          const toHospital = hospitalSimulationsRef.current.get(transfer.toHospitalId);

          if (fromHospital && toHospital && targetHospitalData && sourceHospitalData) {
            // Calculate mortality
            const mortalityResult = calculateTransferMortality(patient, transfer.durationMinutes);

            if (mortalityResult.isDead) {
              console.log(`💀 ${patient.name} DIED during transfer`);
              fromHospital.patients = fromHospital.patients.filter(p => p.id !== patient.id);

              completedTransfersRef.current.push({
                patientId: patient.id,
                patientName: `${patient.name} 💀`,
                fromHospital: sourceHospitalData.name,
                toHospital: `${targetHospitalData.name} (DIED IN TRANSFER)`,
                reason: transfer.reason || 'Unknown',
                time: endTime,
                startTime: transfer.startTime,
                distance: transfer.distance,
                durationMinutes: transfer.durationMinutes
              });
            } else {
              // Survived - move patient
              const survivedPatient = {
                ...patient,
                adjustedMortalityRisk: mortalityResult.adjustedMortalityRisk,
                totalWaitingTime: (patient.totalWaitingTime || 0) + transfer.durationMinutes
              };

              fromHospital.patients = fromHospital.patients.filter(p => p.id !== patient.id);
              const reassigned = reassignPatientVisits(survivedPatient, targetHospitalData.building);
              toHospital.patients.push(reassigned);
              toHospital.transferStats.patientsTransferredIn++;

              completedTransfersRef.current.push({
                patientId: patient.id,
                patientName: patient.name,
                fromHospital: sourceHospitalData.name,
                toHospital: targetHospitalData.name,
                reason: transfer.reason || 'Unknown',
                time: endTime,
                startTime: transfer.startTime,
                distance: transfer.distance,
                durationMinutes: transfer.durationMinutes
              });

              console.log(`✅ Transfer complete: ${patient.name} → ${targetHospitalData.name}`);
            }
          }
        }
      }
    });
  }, [currentTime, currentSeconds, isStressTestMode, cityHospitals]);

  // Get active patient movements
  const activeMovements = useMemo(() => {
    const movements: { patientId: string; from: string; to: string; progress: number }[] = [];
    const [currHours, currMinutes] = currentTime.split(':').map(Number);
    const currTimeSeconds = (currHours * 60 + currMinutes) * 60 + currentSeconds;

    patients.forEach((patient) => {
      const todayVisits = patient.visits.filter(v => v.day === currentDay);
      if (todayVisits.length === 0) return;

      // Check each transition between consecutive visits
      for (let i = 0; i < todayVisits.length - 1; i++) {
        const currentVisit = todayVisits[i];
        const nextVisit = todayVisits[i + 1];

        const [endHours, endMinutes] = currentVisit.endTime.split(':').map(Number);
        const [nextStartHours, nextStartMins] = nextVisit.startTime.split(':').map(Number);
        const endTimeSeconds = (endHours * 60 + endMinutes) * 60;
        const nextStartTimeSeconds = (nextStartHours * 60 + nextStartMins) * 60;

        const transitionStartTime = endTimeSeconds - (5 * 60);
        const transitionEndTime = nextStartTimeSeconds;

        if (currTimeSeconds >= transitionStartTime && currTimeSeconds <= transitionEndTime) {
          const transitionDuration = transitionEndTime - transitionStartTime;
          const elapsed = currTimeSeconds - transitionStartTime;
          const progress = Math.min(1, Math.max(0, elapsed / transitionDuration));

          const currentDept = getDeptById(currentVisit.departmentId);
          const nextDept = getDeptById(nextVisit.departmentId);

          if (currentDept && nextDept) {
            if (currentDept.floor !== nextDept.floor) {
              const midProgress = 0.5;

              if (progress < midProgress) {
                const liftId = `lift-floor${currentDept.floor}`;
                if (currentDept.floor === currentFloor.id) {
                  movements.push({
                    patientId: patient.id,
                    from: currentVisit.departmentId,
                    to: liftId,
                    progress: progress / midProgress,
                  });
                }
              } else {
                const liftId = `lift-floor${nextDept.floor}`;
                if (nextDept.floor === currentFloor.id) {
                  movements.push({
                    patientId: patient.id,
                    from: liftId,
                    to: nextVisit.departmentId,
                    progress: (progress - midProgress) / midProgress,
                  });
                }
              }
            } else {
              if (currentDept.floor === currentFloor.id) {
                movements.push({
                  patientId: patient.id,
                  from: currentVisit.departmentId,
                  to: nextVisit.departmentId,
                  progress: progress,
                });
              }
            }
          }
        }
      }

      // First visit - show entering from entrance
      const firstVisit = todayVisits[0];
      if (firstVisit) {
        const [startHours, startMinutes] = firstVisit.startTime.split(':').map(Number);
        const visitStartSeconds = (startHours * 60 + startMinutes) * 60;
        const transitionStart = visitStartSeconds - (5 * 60);

        if (currTimeSeconds >= transitionStart && currTimeSeconds < visitStartSeconds) {
          const elapsed = currTimeSeconds - transitionStart;
          const progress = Math.min(1, Math.max(0, elapsed / (5 * 60)));

          const firstDept = getDeptById(firstVisit.departmentId);
          if (firstDept) {
            if (currentFloor.id === 1 && firstDept.floor === 1) {
              movements.push({
                patientId: patient.id,
                from: 'entrance',
                to: firstVisit.departmentId,
                progress: progress,
              });
            } else if (currentFloor.id === 1 && firstDept.floor !== 1) {
              movements.push({
                patientId: patient.id,
                from: 'entrance',
                to: 'lift-floor1',
                progress: progress,
              });
            } else if (currentFloor.id === firstDept.floor && firstDept.floor !== 1) {
              const liftId = `lift-floor${firstDept.floor}`;
              movements.push({
                patientId: patient.id,
                from: liftId,
                to: firstVisit.departmentId,
                progress: progress,
              });
            }
          }
        }
      }

      // Last visit - show exiting
      const lastVisit = todayVisits[todayVisits.length - 1];
      if (lastVisit) {
        const [endHours, endMinutes] = lastVisit.endTime.split(':').map(Number);
        const visitEndSeconds = (endHours * 60 + endMinutes) * 60;

        if (currTimeSeconds >= visitEndSeconds && currTimeSeconds < visitEndSeconds + (5 * 60)) {
          const elapsed = currTimeSeconds - visitEndSeconds;
          const progress = Math.min(1, Math.max(0, elapsed / (5 * 60)));

          const lastDept = getDeptById(lastVisit.departmentId);
          if (lastDept) {
            if (currentFloor.id === 1 && lastDept.floor === 1) {
              movements.push({
                patientId: patient.id,
                from: lastVisit.departmentId,
                to: 'exit',
                progress: progress,
              });
            } else if (currentFloor.id === lastDept.floor && lastDept.floor !== 1) {
              const liftId = `lift-floor${lastDept.floor}`;
              movements.push({
                patientId: patient.id,
                from: lastVisit.departmentId,
                to: liftId,
                progress: progress,
              });
            } else if (currentFloor.id === 1 && lastDept.floor !== 1) {
              movements.push({
                patientId: patient.id,
                from: 'lift-floor1',
                to: 'exit',
                progress: progress,
              });
            }
          }
        }
      }
    });

    return movements;
  }, [patients, currentTime, currentDay, currentFloor, currentSeconds]);

  // Get all patients currently on this floor
  const patientsOnFloor = useMemo(() => {
    return patients.filter((patient) => {
      const location = getPatientLocationAtTime(patient.id, currentTime, currentDay);
      if (!location) return false;
      const dept = getDeptById(location);
      return dept && dept.floor === currentFloor.id;
    });
  }, [patients, currentTime, currentDay, currentFloor]);

  // Main simulation view
  const simulationView = (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold mb-1 text-foreground">
          Hospital Simulation
        </h1>
        <p className="text-muted-foreground text-sm">
          Patient flow visualization with queue system and capacity management
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-6 gap-6">
          {/* LEFT COLUMN - Controls & Stats */}
          <div className="lg:col-span-1 space-y-4">
            <TimeSimulator
              currentTime={currentTime}
              currentDay={currentDay}
              onTimeChange={setCurrentTime}
              isPlaying={isPlaying}
              onPlayPause={() => setIsPlaying(!isPlaying)}
              speed={speed}
              onSpeedChange={setSpeed}
              totalEntrances={patientsEntered}
              totalExits={patientsExited}
              currentSeconds={currentSeconds}
              onSecondsChange={setCurrentSeconds}
              endTime={simulationEndTime}
            />

            {/* Floor Statistics */}
            {viewMode === 'city' && cityHospitals.length > 0 ? (
              // City-wide statistics
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">🏙️ City Statistics</CardTitle>
                  <CardDescription>All {cityHospitals.length} hospitals combined</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(() => {
                    let totalPatients = 0;
                    let totalEntered = 0;
                    let totalExited = 0;
                    let totalInTreatment = 0;
                    let totalWaiting = 0;
                    let totalDeaths = 0;
                    let totalCapacity = 0;
                    let totalOccupied = 0;

                    cityHospitals.forEach(hospital => {
                      const hospitalSim = hospitalSimulationsRef.current.get(hospital.id);
                      if (hospitalSim && hospitalSim.isReady) {
                        totalPatients += hospitalSim.patients.length;

                        const state = hospitalSim.precomputer.getStateAtTime(currentTime);
                        if (state) {
                          totalEntered += state.stats.totalEntered;
                          totalExited += state.stats.totalExited;
                        }

                        const globalStats = hospitalSim.queueManager.getGlobalStats();
                        totalInTreatment += globalStats.totalOccupied;
                        totalWaiting += globalStats.totalQueued;
                        totalDeaths += globalStats.totalDeaths;
                        totalCapacity += globalStats.totalCapacity;
                        totalOccupied += globalStats.totalOccupied;
                      }
                    });

                    const overallUtilization = totalCapacity > 0 ? (totalOccupied / totalCapacity) * 100 : 0;

                    // Helper: Convert time string to minutes
                    const timeToMinutes = (time: string): number => {
                      const [h, m] = time.split(':').map(Number);
                      return h * 60 + m;
                    };

                    const currentMinutes = timeToMinutes(currentTime);

                    // Filter completed transfers to only include those that happened BEFORE current time
                    const validCompletedTransfers = completedTransfersRef.current.filter(transfer => {
                      const transferMinutes = timeToMinutes(transfer.time);
                      return transferMinutes <= currentMinutes;
                    });

                    // Count UNIQUE patients transferred (not total number of transfers)
                    // Only count transfers that have happened by current time
                    const uniqueTransferredPatients = new Set([
                      ...validCompletedTransfers.map(t => t.patientId),
                      ...transferringPatients.map(p => p.id)
                    ]).size;

                    // Count UNIQUE patients who left the system (not number of transfers)
                    const uniquePatientsLeftSystem = new Set(
                      validCompletedTransfers
                        .filter(t => t.toHospital === 'ABROAD')
                        .map(t => t.patientId)
                    ).size;

                    // Count patients currently leaving
                    const patientsCurrentlyLeaving = transferringPatients.filter(
                      p => p.transferTo === 'OUTSIDE_SYSTEM'
                    ).length;

                    const totalTransfersCompleted = validCompletedTransfers.length;
                    const totalTransfersInProgress = transferringPatients.length;

                    return (
                      <>
                        <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                          <span className="text-sm text-muted-foreground">Total patients:</span>
                          <Badge variant="default">{totalPatients}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <span className="text-sm text-muted-foreground">Entered:</span>
                          <Badge variant="default" className="bg-green-600">{totalEntered}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <span className="text-sm text-muted-foreground">Exited:</span>
                          <Badge variant="default" className="bg-blue-600">{totalExited}</Badge>
                        </div>
                        <Separator />
                        <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                          <span className="text-sm text-muted-foreground">In treatment:</span>
                          <Badge variant="default">{totalInTreatment}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                          <span className="text-sm text-muted-foreground">Waiting:</span>
                          <Badge variant="default" className="bg-yellow-500">{totalWaiting}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                          <span className="text-sm text-muted-foreground">City utilization:</span>
                          <Badge variant="outline">{overallUtilization.toFixed(1)}%</Badge>
                        </div>
                        <Separator />
                        {uniqueTransferredPatients > 0 && (
                          <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                            <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">🏥 Patients Transferred:</span>
                            <Badge className="bg-purple-600 text-white">{uniqueTransferredPatients}</Badge>
                          </div>
                        )}
                        {transferringPatients.length > 0 && (
                          <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 border border-red-500 rounded-lg animate-pulse">
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">🚑 Active Transfer:</span>
                            <Badge className="bg-red-600 text-white">{transferringPatients.length}</Badge>
                          </div>
                        )}
                        {totalTransfersCompleted > 0 && (
                          <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">✅ Completed Transfers:</span>
                            <Badge className="bg-green-600 text-white">{totalTransfersCompleted}</Badge>
                          </div>
                        )}
                        {uniquePatientsLeftSystem > 0 && (
                          <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 border border-red-700 rounded-lg">
                            <span className="text-sm font-bold text-red-700 dark:text-red-400">🌍 Left System:</span>
                            <div className="flex flex-col items-end">
                              <Badge className="bg-red-700 text-white">{uniquePatientsLeftSystem}</Badge>
                              {patientsCurrentlyLeaving > 0 && (
                                <span className="text-xs text-red-500 mt-0.5">({patientsCurrentlyLeaving} en route)</span>
                              )}
                            </div>
                          </div>
                        )}
                        {uniqueTransferredPatients > 0 && (
                          <Separator />
                        )}
                        {totalDeaths > 0 && (
                          <div className="flex justify-between items-center p-2 bg-black dark:bg-gray-900 border border-red-600 rounded-lg">
                            <span className="text-sm font-bold text-red-600 dark:text-red-400">Total Deaths (City):</span>
                            <Badge className="bg-red-600 text-white text-base">{totalDeaths}</Badge>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </CardContent>
              </Card>
            ) : (
              // Single hospital/floor statistics
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedHospitalId && cityHospitals.length > 0
                      ? `📊 ${cityHospitals.find(h => h.id === selectedHospitalId)?.name}`
                      : `Stats: ${currentFloor.name}`
                    }
                  </CardTitle>
                  {selectedHospitalId && cityHospitals.length > 0 && (
                    <CardDescription>Hospital-specific statistics</CardDescription>
                  )}
                </CardHeader>
                <CardContent className="space-y-3">
                {/* Hospital Transfer Stats (if in city mode and hospital selected) */}
                {selectedHospitalId && cityHospitals.length > 0 && (() => {
                  const hospitalSim = hospitalSimulationsRef.current.get(selectedHospitalId);
                  if (hospitalSim) {
                    const transferredOut = hospitalSim.transferStats.patientsTransferredOut;
                    const transferredIn = hospitalSim.transferStats.patientsTransferredIn;
                    const totalOriginal = hospitalSim.patients.length + transferredOut - transferredIn;
                    const patientsServed = totalOriginal - transferredOut;

                    return (
                      <>
                        <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                          <span className="text-sm text-muted-foreground">📥 Original patients:</span>
                          <Badge variant="default">{totalOriginal}</Badge>
                        </div>
                        <div className="flex justify-between items-center p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                          <span className="text-sm text-muted-foreground">✅ Served here:</span>
                          <Badge className="bg-green-600 text-white">{patientsServed}</Badge>
                        </div>
                        {transferredOut > 0 && (
                          <div className="flex justify-between items-center p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">📤 Transferred out:</span>
                            <Badge className="bg-orange-600 text-white">{transferredOut}</Badge>
                          </div>
                        )}
                        {transferredIn > 0 && (
                          <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                            <span className="text-sm text-muted-foreground">📥 Received:</span>
                            <Badge className="bg-blue-600 text-white">{transferredIn}</Badge>
                          </div>
                        )}
                        <div className="flex justify-between items-center p-2 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
                          <span className="text-sm text-muted-foreground">👥 Current total:</span>
                          <Badge className="bg-purple-600 text-white">{hospitalSim.patients.length}</Badge>
                        </div>
                        <Separator />
                      </>
                    );
                  }
                  return null;
                })()}

                <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Active patients:</span>
                  <Badge variant="default">{patientsOnFloor.length}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">Departments:</span>
                  <Badge variant="secondary">{currentFloor.departments.length}</Badge>
                </div>
                <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                  <span className="text-sm text-muted-foreground">In transit:</span>
                  <Badge variant="outline">{activeMovements.length}</Badge>
                </div>

                {/* Queue stats in stress test mode */}
                {isStressTestMode && queueManagerRef.current && (
                  <>
                    <Separator />
                    <div className="space-y-2">
                      <div className="text-xs font-semibold text-muted-foreground">Queue Statistics</div>
                      {(() => {
                        const globalStats = queueManagerRef.current!.getGlobalStats();
                        return (
                          <>
                            <div className="flex justify-between items-center p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                              <span className="text-sm text-muted-foreground">In treatment:</span>
                              <Badge variant="default">{globalStats.totalOccupied}</Badge>
                            </div>
                            <div className="flex justify-between items-center p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                              <span className="text-sm text-muted-foreground">Waiting:</span>
                              <Badge variant="default" className="bg-yellow-500">{globalStats.totalQueued}</Badge>
                            </div>
                            {globalStats.totalBlocked > 0 && (
                              <div className="flex justify-between items-center p-2 bg-red-50 dark:bg-red-900/20 rounded-lg">
                                <span className="text-sm text-muted-foreground">Blocked depts:</span>
                                <Badge variant="destructive">{globalStats.totalBlocked}</Badge>
                              </div>
                            )}
                            <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                              <span className="text-sm text-muted-foreground">Utilization:</span>
                              <Badge variant="outline">{globalStats.overallUtilization.toFixed(1)}%</Badge>
                            </div>
                            {globalStats.totalDeaths > 0 && (
                              <div className="flex justify-between items-center p-2 bg-black dark:bg-gray-900 border border-red-600 rounded-lg">
                                <span className="text-sm font-bold text-red-600 dark:text-red-400">Total Deaths:</span>
                                <Badge className="bg-red-600 text-white text-base">{globalStats.totalDeaths}</Badge>
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
            )}

            {/* Selected Department Details */}
            {selectedDepartment && (() => {
              const dept = getDeptById(selectedDepartment);
              if (!dept) return null;

              const patientsInSelectedDept = isStressTestMode && queueManagerRef.current
                ? (() => {
                    const queueState = queueManagerRef.current!.getQueueState(selectedDepartment);
                    return queueState ? queueState.currentOccupancy : 0;
                  })()
                : getPatientsInDept(selectedDepartment, currentTime, currentDay).length;

              const deptCapacity = stressTestCapacities?.[selectedDepartment]?.capacity ?? dept.capacity ?? 10;
              const queueLength = isStressTestMode && queueManagerRef.current
                ? queueManagerRef.current.getQueueState(selectedDepartment)?.queue.length ?? 0
                : 0;

              return (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">{dept.name}</CardTitle>
                    <CardDescription>Type: {dept.type}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Occupancy:</span>
                      <Badge variant="default">{patientsInSelectedDept} / {deptCapacity}</Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-muted rounded-lg">
                      <span className="text-sm text-muted-foreground">Utilization:</span>
                      <Badge variant="outline">
                        {deptCapacity > 0 ? Math.round((patientsInSelectedDept / deptCapacity) * 100) : 0}%
                      </Badge>
                    </div>
                    {queueLength > 0 && (
                      <div className="p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground font-semibold">Waiting:</span>
                          <Badge className="bg-yellow-500">{queueLength}</Badge>
                        </div>
                      </div>
                    )}
                    {patientsInSelectedDept >= deptCapacity && (
                      <div className="p-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-center">
                        <span className="text-sm font-semibold text-red-600 dark:text-red-400">
                          BLOCKED (max capacity)
                        </span>
                      </div>
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setSelectedDepartment(null)}
                    >
                      Close
                    </Button>
                  </CardContent>
                </Card>
              );
            })()}

            {isStressTestMode && (
              <div className="space-y-2">
                <Button
                  variant="default"
                  onClick={() => {
                    setIsStressTestMode(false);
                    setStressTestPatients(null);
                    setStressTestCapacities(null);
                    setIsInSetupMode(true);
                    setCurrentTime('08:00');
                    setCurrentSeconds(0);
                    setIsPlaying(false);
                    setIsPrecomputeReady(false);
                    queueManagerRef.current = null;
                    precomputerRef.current = null;
                  }}
                  className="w-full"
                >
                  New Simulation
                </Button>
                <Button
                  variant="outline"
                  onClick={handleResetToDefault}
                  className="w-full"
                >
                  Reset to Default
                </Button>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN - Canvas View */}
          <div className="lg:col-span-5 space-y-4">
            {isPrecomputing && (
              <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-500">
                <CardContent className="pt-4 pb-3">
                  <div className="text-sm font-semibold mb-2 text-blue-600 dark:text-blue-400">
                    Pre-computing simulation...
                  </div>
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div
                      className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${precomputeProgress}%` }}
                    ></div>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {Math.round(precomputeProgress)}% - calculating all states
                  </div>
                </CardContent>
              </Card>
            )}

            {isPrecomputeReady && (
              <Card className="bg-green-50 dark:bg-green-900/20 border-green-500">
                <CardContent className="pt-3 pb-2">
                  <div className="text-xs font-semibold text-green-600 dark:text-green-400">
                    Ready! Instant navigation enabled (all states pre-calculated)
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xl">
                      {viewMode === 'city' ? (
                        `City View`
                      ) : cityHospitals.length > 0 ? (
                        `${cityHospitals.find(h => h.id === selectedHospitalId)?.name} - ${currentFloor.name}`
                      ) : (
                        currentFloor.name
                      )}
                    </CardTitle>
                    <Badge variant="outline" className="text-xs">
                      {currentTime}
                    </Badge>
                  </div>

                  {/* Navigation */}
                  <div className="space-y-2">
                    {cityHospitals.length > 0 && (
                      <div className="flex items-center gap-2">
                        <Button
                          variant={viewMode === 'city' ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setViewMode('city')}
                          className="transition-all duration-200"
                        >
                          City View ({cityHospitals.length} hospitals)
                        </Button>
                      </div>
                    )}

                    {cityHospitals.length > 0 && viewMode === 'hospital' && (
                      <div className="flex flex-wrap gap-2">
                        {cityHospitals.map((hospital) => (
                          <Button
                            key={hospital.id}
                            variant={selectedHospitalId === hospital.id ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => {
                              setSelectedHospitalId(hospital.id);
                              setCurrentBuilding(hospital.building);
                              setSelectedFloor(0);
                            }}
                            className="transition-all duration-200"
                          >
                            {hospital.name}
                          </Button>
                        ))}
                      </div>
                    )}

                    {viewMode === 'hospital' && currentBuilding.floors.length > 1 && (
                      <div className="flex flex-wrap gap-2">
                        {currentBuilding.floors.map((floor, idx) => (
                          <Button
                            key={floor.id}
                            variant={selectedFloor === idx ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSelectedFloor(idx)}
                            className="transition-all duration-200 hover:scale-105"
                          >
                            {floor.name}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>

                  <Separator />

                  {viewMode === 'city' ? (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="font-semibold">Total Hospitals:</span>
                      <Badge variant="secondary">{cityHospitals.length}</Badge>
                      <span className="ml-2">Click on a hospital for details</span>
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className="font-semibold">Active rooms:</span>
                      <Badge variant="secondary">{currentFloor.departments.length}</Badge>
                      <span className="ml-2">|</span>
                      <span className="ml-2">Patients moving:</span>
                      <Badge variant="default">{activeMovements.length}</Badge>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {viewMode === 'city' ? (
                  <IsometricCityView
                    hospitals={cityHospitals}
                    selectedHospitalId={selectedHospitalId}
                    onHospitalClick={(hospitalId) => {
                      setSelectedHospitalId(hospitalId);
                      const hospital = cityHospitals.find(h => h.id === hospitalId);
                      if (hospital) {
                        setCurrentBuilding(hospital.building);
                        setSelectedFloor(0);
                        setViewMode('hospital');
                      }
                    }}
                    onCameraChange={setCityCamera}
                    transferringPatients={transferringPatients}
                    currentTime={currentTime}
                    currentSeconds={currentSeconds}
                  />
                ) : (
                  <IsometricFloorView
                    floor={currentFloor}
                    selectedDepartment={selectedDepartment}
                    onDepartmentClick={handleDepartmentClick}
                    currentTime={currentTime}
                    currentDay={currentDay}
                    activePatients={activeMovements}
                    totalEntrances={patientsEntered}
                    totalExits={patientsExited}
                    currentSeconds={currentSeconds}
                    customCapacities={stressTestCapacities || undefined}
                    queueManager={queueManagerRef.current}
                    queueUpdateTrigger={queueUpdateTrigger}
                    departmentOccupancies={departmentOccupancies}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Fixed Buttons - Bottom Right */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-3 z-30">
          <Button
            onClick={() => setIsStatsPanelOpen(true)}
            className="h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-transform"
            size="lg"
            title="Department Statistics"
          >
            <span className="text-2xl">📊</span>
          </Button>

          <Button
            onClick={() => setIsAnalyticsPanelOpen(true)}
            className="h-14 w-14 rounded-full shadow-2xl hover:scale-110 transition-transform bg-purple-600 hover:bg-purple-700"
            size="lg"
            title="Detailed Analytics"
          >
            <span className="text-2xl">📈</span>
          </Button>
        </div>

        {/* Statistics Panel */}
        <StatisticsPanel
          patients={patients}
          currentTime={currentTime}
          currentDay={currentDay}
          queueManager={queueManagerRef.current}
          isStressTestMode={isStressTestMode}
          isOpen={isStatsPanelOpen}
          onClose={() => setIsStatsPanelOpen(false)}
          completedTransfers={completedTransfersRef.current}
          activeTransfers={transferringPatients}
        />

        {/* Analytics Panel */}
        <div
          className={`fixed top-0 right-0 h-full w-full md:w-[500px] bg-background border-l shadow-2xl z-50 transition-transform duration-300 ease-in-out ${
            isAnalyticsPanelOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full flex flex-col">
            <div className="p-4 border-b bg-muted/50">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold">Detailed Analytics</h2>
                <Button variant="ghost" size="sm" onClick={() => setIsAnalyticsPanelOpen(false)}>
                  Close
                </Button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <DetailedAnalytics
                patients={patients}
                currentTime={currentTime}
                currentDay={currentDay}
                queueManager={queueManagerRef.current}
                isStressTestMode={isStressTestMode}
                completedTransfers={completedTransfersRef.current}
                activeTransfers={transferringPatients}
                hospitals={cityHospitals.map(h => ({
                  id: h.id,
                  name: h.name,
                  patients: hospitalSimulationsRef.current.get(h.id)?.patients || [],
                  queueManager: hospitalSimulationsRef.current.get(h.id)?.queueManager || null
                }))}
                isCityMode={cityHospitals.length > 0}
              />
            </div>
          </div>
        </div>

        {/* Overlay for Analytics Panel */}
        {isAnalyticsPanelOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 transition-opacity duration-300"
            onClick={() => setIsAnalyticsPanelOpen(false)}
          />
        )}
    </div>
  );

  // Show setup screen if in setup mode
  if (isInSetupMode) {
    return <SimulationSetup onStartSimulation={handleStartSimulation} />;
  }

  // Show simulation view
  return simulationView;
}
