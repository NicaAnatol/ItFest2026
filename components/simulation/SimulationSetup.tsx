'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import {
  SimulationConfig,
  SIMULATION_PRESETS,
  SimulationPreset,
  DepartmentCapacityConfig,
  ConditionConfig,
  DepartmentRouteFilter,
  CustomFloorConfig,
  CustomDepartmentConfig,
  CityConfig,
  HospitalConfig
} from '@/lib/simulation/types/simulationConfig';
import { building } from '@/lib/simulation/data/buildingData';
import {
  emergencyConditions,
  commonConditions,
  hospitalizedConditions,
  scheduledCheckupConditions
} from '@/lib/simulation/data/medicalStatistics';
import { AVAILABLE_DEPARTMENTS, DepartmentTemplate } from '@/lib/simulation/data/availableDepartments';
import { ChevronRight, Info, Plus, Trash2, AlertCircle, Building2, MapPin, Settings, Users, Building, Activity, Bug, Zap } from 'lucide-react';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

interface SimulationSetupProps {
  onStartSimulation: (config: SimulationConfig) => void;
  onCancel?: () => void;
}

export default function SimulationSetup({ onStartSimulation, onCancel }: SimulationSetupProps) {
  const [selectedPreset, setSelectedPreset] = useState<SimulationPreset>(SIMULATION_PRESETS[0]);
  const [config, setConfig] = useState<SimulationConfig>(() => {
    const capacities: DepartmentCapacityConfig[] = [];
    building.floors.forEach(floor => {
      floor.departments.forEach(dept => {
        capacities.push({
          departmentId: dept.id,
          capacity: dept.capacity || 5,
          processingTimeMinutes: dept.processingTimeMinutes || 30
        });
      });
    });
    return {
      totalPatients: 500,
      simulationDay: 'Test Day',
      startTime: '07:00',
      endTime: '20:00',
      departmentCapacities: capacities,
      patientTypeDistribution: {
        emergency: 15,
        common: 50,
        hospitalized: 20,
        scheduled_checkup: 15
      },
      severityDistribution: {
        critical: 10,
        high: 20,
        medium: 40,
        low: 30
      },
      specificConditions: [],
      departmentFilters: [],
      randomDeviation: {
        enabled: true,
        severityShift: 0,
        mortalityMultiplier: 1.0,
        timeMultiplier: 1.0,
        patientCountVariance: 10
      },
      advancedSettings: {
        peakHourMultiplier: 1.5,
        ageDistributionShift: 'balanced',
        emergencyFrequency: 'normal',
        useAllDepartments: false,
        minimumQueueLength: 0
      }
    };
  });

  const [activeTab, setActiveTab] = useState('preset');

  // Custom building state
  const [customFloorCount, setCustomFloorCount] = useState(4);
  const [maxFloors, setMaxFloors] = useState(10); // Allow up to 10 floors
  const [selectedDepartments, setSelectedDepartments] = useState<{
    floorId: number;
    departments: DepartmentTemplate[];
  }[]>(() => {
    const floorGroups: { [key: number]: DepartmentTemplate[] } = {};
    AVAILABLE_DEPARTMENTS.forEach(dept => {
      if (!floorGroups[dept.floor]) {
        floorGroups[dept.floor] = [];
      }
      floorGroups[dept.floor].push(dept);
    });
    return Object.keys(floorGroups).map(floorId => ({
      floorId: parseInt(floorId),
      departments: floorGroups[parseInt(floorId)]
    }));
  });

  // City configuration state
  const [cityEnabled, setCityEnabled] = useState(false);
  const [cityName, setCityName] = useState('Test City');
  const [cityPopulation, setCityPopulation] = useState(100000);
  const [hospitalCount, setHospitalCount] = useState(3);
  const [avgDistance, setAvgDistance] = useState(5); // km
  const [distributionMode, setDistributionMode] = useState<'auto' | 'manual' | 'custom'>('auto');
  const [hospitals, setHospitals] = useState<HospitalConfig[]>([]);
  const [selectedHospitalId, setSelectedHospitalId] = useState<string | null>(null);

  // Track saved configurations per hospital
  const [savedHospitalConfigs, setSavedHospitalConfigs] = useState<{ [hospitalId: string]: boolean }>({});

  // Memoize selected hospital to avoid repeated .find() calls (eliminates 23+ redundant searches)
  const selectedHospital = useMemo(
    () => hospitals.find(h => h.id === selectedHospitalId),
    [hospitals, selectedHospitalId]
  );

  // Calculate actual floor count (only floors with departments)
  const actualFloorCount = useMemo(() => {
    const floorsWithDepts = selectedDepartments.filter(f => f.departments.length > 0);
    return floorsWithDepts.length;
  }, [selectedDepartments]);

  // Get highest floor with departments
  const highestOccupiedFloor = useMemo(() => {
    const occupied = selectedDepartments
      .filter(f => f.departments.length > 0)
      .map(f => f.floorId);
    return occupied.length > 0 ? Math.max(...occupied) : 0;
  }, [selectedDepartments]);


  // Apply preset
  const applyPreset = (preset: SimulationPreset) => {
    setSelectedPreset(preset);
    setConfig(prev => ({
      ...prev,
      ...preset.config,
      departmentCapacities: prev.departmentCapacities, // Keep capacity settings
      specificConditions: prev.specificConditions || [],
      departmentFilters: preset.config.departmentFilters || []
    }));
  };

  // Update patient type distribution
  const updatePatientType = (type: 'emergency' | 'common' | 'hospitalized' | 'scheduled_checkup', value: number) => {
    setConfig(prev => ({
      ...prev,
      patientTypeDistribution: {
        ...prev.patientTypeDistribution!,
        [type]: value
      }
    }));
  };

  // Update severity distribution
  const updateSeverity = (severity: 'critical' | 'high' | 'medium' | 'low', value: number) => {
    setConfig(prev => ({
      ...prev,
      severityDistribution: {
        ...prev.severityDistribution!,
        [severity]: value
      }
    }));
  };

  // Update department capacity
  const updateDepartmentCapacity = (deptId: string, field: 'capacity' | 'processingTimeMinutes', value: number) => {
    setConfig(prev => ({
      ...prev,
      departmentCapacities: prev.departmentCapacities.map(d =>
        d.departmentId === deptId ? { ...d, [field]: value } : d
      )
    }));
  };

  // Add specific condition
  const addCondition = (conditionName: string, patientCount: number) => {
    setConfig(prev => ({
      ...prev,
      specificConditions: [
        ...(prev.specificConditions || []),
        { conditionName, patientCount }
      ]
    }));
  };

  // Remove specific condition
  const removeCondition = (index: number) => {
    setConfig(prev => ({
      ...prev,
      specificConditions: prev.specificConditions?.filter((_, i) => i !== index) || []
    }));
  };

  // Toggle department filter
  const toggleDepartmentFilter = (deptId: string) => {
    setConfig(prev => {
      const existing = prev.departmentFilters?.find(f => f.departmentId === deptId);
      if (existing) {
        return {
          ...prev,
          departmentFilters: prev.departmentFilters?.filter(f => f.departmentId !== deptId)
        };
      } else {
        return {
          ...prev,
          departmentFilters: [...(prev.departmentFilters || []), { departmentId: deptId, mustInclude: true }]
        };
      }
    });
  };

  // Get all conditions
  const allConditions = [
    ...emergencyConditions,
    ...commonConditions,
    ...hospitalizedConditions,
    ...scheduledCheckupConditions
  ];

  // Calculate totals
  const totalPatientTypePercent = Object.values(config.patientTypeDistribution || {}).reduce((a, b) => a + b, 0);
  const totalSeverityPercent = Object.values(config.severityDistribution || {}).reduce((a, b) => a + b, 0);
  const totalSpecificPatients = config.specificConditions?.reduce((sum, c) => sum + c.patientCount, 0) || 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">Hospital Simulation Configuration</h1>
          <p className="text-muted-foreground">Configure simulation parameters to model realistic scenarios</p>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Left Sidebar - Presets */}
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Presets</CardTitle>
                <CardDescription>Predefined templates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {SIMULATION_PRESETS.map(preset => (
                  <Button
                    key={preset.name}
                    variant={selectedPreset.name === preset.name ? 'default' : 'outline'}
                    className="w-full justify-start"
                    onClick={() => applyPreset(preset)}
                  >
                    <span className="mr-2">{preset.icon}</span>
                    <span className="flex-1 text-left">{preset.name}</span>
                  </Button>
                ))}
              </CardContent>
            </Card>

            {/* Quick Summary */}
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Sumar Rapid</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Total Patients:</span>
                  <span className="font-bold">{config.totalPatients}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Interval:</span>
                  <span className="font-bold">{config.startTime} - {config.endTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-300">Departments:</span>
                  <span className="font-bold">{config.departmentCapacities.length}</span>
                </div>
                {totalSpecificPatients > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-300">Specific Conditions:</span>
                    <span className="font-bold text-blue-600">{totalSpecificPatients}</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Main Configuration */}
          <div className="lg:col-span-3">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-8">
                <TabsTrigger value="city">🏙️ City</TabsTrigger>
                <TabsTrigger value="preset">Preset</TabsTrigger>
                <TabsTrigger value="structure">🏗️ Structure</TabsTrigger>
                <TabsTrigger value="patients">Patients</TabsTrigger>
                <TabsTrigger value="departments">Departments</TabsTrigger>
                <TabsTrigger value="conditions">Diseases</TabsTrigger>
                <TabsTrigger value="routing">Routing</TabsTrigger>
                <TabsTrigger value="advanced">Advanced</TabsTrigger>
              </TabsList>

              {/* City Tab - NEW */}
              <TabsContent value="city" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-8 w-8 text-blue-600" />
                        <div>
                          <CardTitle>City Configuration</CardTitle>
                          <CardDescription>Configure the city and multiple hospitals</CardDescription>
                        </div>
                      </div>
                      <Switch
                        checked={cityEnabled}
                        onCheckedChange={(checked) => {
                          setCityEnabled(checked);
                          if (checked && hospitals.length === 0) {
                            // Initialize hospitals based on count
                            const newHospitals: HospitalConfig[] = [];
                            for (let i = 0; i < hospitalCount; i++) {
                              newHospitals.push({
                                id: `hospital-${i + 1}`,
                                name: `Hospital ${i + 1}`,
                                position: { x: i * 200, y: 0 },
                                simulationConfig: { ...config }
                              });
                            }
                            setHospitals(newHospitals);
                            setSelectedHospitalId(newHospitals[0]?.id || null);
                          }
                        }}
                      />
                    </div>
                  </CardHeader>

                  {cityEnabled && (
                    <CardContent className="space-y-6">
                      {/* City-wide Settings */}
                      <div className="space-y-4 p-4 bg-muted/50 rounded-lg border">
                        <h3 className="font-semibold text-base flex items-center gap-2">
                          <MapPin className="h-5 w-5 text-primary" />
                          City Parameters
                        </h3>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label>City Name</Label>
                            <Input
                              value={cityName}
                              onChange={(e) => setCityName(e.target.value)}
                              placeholder="ex: Bucharest"
                            />
                          </div>

                          <div>
                            <Label>Population</Label>
                            <Input
                              type="number"
                              value={cityPopulation}
                              onChange={(e) => setCityPopulation(parseInt(e.target.value) || 0)}
                              min={1000}
                              step={10000}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              {(cityPopulation / 1000).toFixed(0)}k inhabitants
                            </p>
                          </div>

                          <div>
                            <Label>Number of Hospitals</Label>
                            <Input
                              type="number"
                              value={hospitalCount}
                              onChange={(e) => {
                                const newCount = parseInt(e.target.value) || 1;
                                setHospitalCount(Math.max(1, Math.min(10, newCount)));
                              }}
                              min={1}
                              max={10}
                            />
                            <div className="flex gap-1 mt-2">
                              {[1, 2, 3, 4, 5].map(num => (
                                <Button
                                  key={num}
                                  size="sm"
                                  variant={hospitalCount === num ? 'default' : 'outline'}
                                  onClick={() => setHospitalCount(num)}
                                >
                                  {num}
                                </Button>
                              ))}
                            </div>
                          </div>

                          <div>
                            <Label>Average Distance (km)</Label>
                            <Input
                              type="number"
                              value={avgDistance}
                              onChange={(e) => setAvgDistance(parseFloat(e.target.value) || 0)}
                              min={0.5}
                              max={50}
                              step={0.5}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Between hospitals: {avgDistance} km
                            </p>
                          </div>
                        </div>

                        <Separator />

                        {/* Distribution Mode */}
                        <div>
                          <Label className="text-base font-semibold">Distribution Mode</Label>
                          <p className="text-xs text-muted-foreground mb-3">
                            How hospitals are configured from city
                          </p>

                          <div className="grid grid-cols-3 gap-3">
                            <Card
                              className={`cursor-pointer transition-all border-2 ${
                                distributionMode === 'auto'
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-primary/50 hover:bg-accent'
                              }`}
                              onClick={() => setDistributionMode('auto')}
                            >
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">🤖 Automatic</CardTitle>
                                <CardDescription className="text-xs">
                                  Based on population. System calculates everything automatically.
                                </CardDescription>
                              </CardHeader>
                            </Card>

                            <Card
                              className={`cursor-pointer transition-all border-2 ${
                                distributionMode === 'manual'
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-primary/50 hover:bg-accent'
                              }`}
                              onClick={() => setDistributionMode('manual')}
                            >
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">📋 Manual (All Same)</CardTitle>
                                <CardDescription className="text-xs">
                                  All hospitals have same settings. Configure once.
                                </CardDescription>
                              </CardHeader>
                            </Card>

                            <Card
                              className={`cursor-pointer transition-all border-2 ${
                                distributionMode === 'custom'
                                  ? 'border-primary bg-primary/5'
                                  : 'hover:border-primary/50 hover:bg-accent'
                              }`}
                              onClick={() => setDistributionMode('custom')}
                            >
                              <CardHeader className="p-4">
                                <CardTitle className="text-sm">⚙️ Custom (Per Hospital)</CardTitle>
                                <CardDescription className="text-xs">
                                  Each hospital is configured individually, completely.
                                </CardDescription>
                              </CardHeader>
                            </Card>
                          </div>
                        </div>

                        {/* Auto Mode Info */}
                        {distributionMode === 'auto' && (
                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border">
                            <p className="text-sm font-semibold flex items-center gap-2">
                              <span>📊</span> Automatic Calculation
                            </p>
                            <ul className="text-xs text-muted-foreground mt-2 space-y-1 ml-4 list-disc">
                              <li>Patients per hospital: ~{Math.floor(cityPopulation / hospitalCount / 100)} per day</li>
                              <li>Capacity adjusted automatically by population</li>
                              <li>Uniform distribution in city</li>
                            </ul>
                          </div>
                        )}

                        {/* Manual Mode Info */}
                        {distributionMode === 'manual' && (
                          <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-lg border">
                            <p className="text-sm font-semibold flex items-center gap-2">
                              <span>✏️</span> Unique Configuration
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Configure settings once below. All hospitals will have same values.
                            </p>
                          </div>
                        )}

                        {/* Custom Mode Info */}
                        {distributionMode === 'custom' && (
                          <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border">
                            <p className="text-sm font-semibold flex items-center gap-2">
                              <span>🎨</span> Complete Customization
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              Select a hospital below and configure it completely independent (structure, floors, departments, capacity, patients).
                            </p>
                          </div>
                        )}

                        {/* Generate Hospitals Button */}
                        <Button
                          className="w-full"
                          size="lg"
                          onClick={() => {
                            const newHospitals: HospitalConfig[] = [];
                            const baseConfig = { ...config };

                            // Build default custom building from selected departments
                            const buildCustomBuilding = (floorCount: number) => {
                              const customFloors: CustomFloorConfig[] = selectedDepartments
                                .filter(f => f.floorId <= floorCount && f.departments.length > 0)
                                .map(f => ({
                                  id: f.floorId,
                                  name: f.floorId === 1 ? 'Ground Floor' : `Floor ${f.floorId - 1}`,
                                  departments: f.departments.map(d => ({
                                    id: d.id,
                                    name: d.name,
                                    type: d.type,
                                    capacity: config.departmentCapacities.find(dc => dc.departmentId === d.id)?.capacity || d.defaultCapacity,
                                    processingTimeMinutes: config.departmentCapacities.find(dc => dc.departmentId === d.id)?.processingTimeMinutes || d.defaultProcessingTime,
                                    position: { x: 0, y: 0 },
                                    color: d.color
                                  }))
                                }));

                              return {
                                enabled: true,
                                floors: customFloors,
                                floorCount: floorCount
                              };
                            };

                            for (let i = 0; i < hospitalCount; i++) {
                              let hospitalConfig = { ...baseConfig };
                              const customBuilding = buildCustomBuilding(customFloorCount);

                              if (distributionMode === 'auto') {
                                // Auto: calculate based on population
                                const patientsPerHospital = Math.floor((cityPopulation / hospitalCount) * 0.003); // 0.3% daily hospital visits
                                hospitalConfig.totalPatients = patientsPerHospital;
                              } else if (distributionMode === 'manual') {
                                // Manual: use base config for all
                                hospitalConfig = { ...baseConfig };
                              } else {
                                // Custom: start with base but allow individual customization
                                hospitalConfig = { ...baseConfig };
                              }

                              newHospitals.push({
                                id: `hospital-${i + 1}`,
                                name: `Hospital ${cityName} ${i + 1}`,
                                position: {
                                  x: (i % 3) * 300,
                                  y: Math.floor(i / 3) * 300
                                },
                                simulationConfig: hospitalConfig,
                                customBuilding: customBuilding
                              });
                            }

                            setHospitals(newHospitals);
                            setSelectedHospitalId(newHospitals[0]?.id || null);
                          }}
                        >
                          <Building2 className="h-5 w-5 mr-2" />
                          Generate {hospitalCount} Hospitals
                        </Button>
                      </div>

                      <Separator />

                      {/* Hospital List & Configuration */}
                      {hospitals.length > 0 && (
                        <div className="space-y-4">
                          <h3 className="font-semibold text-base flex items-center gap-2">
                            <Building2 className="h-5 w-5 text-primary" />
                            Hospitals from City ({hospitals.length})
                          </h3>

                          {/* Hospital Selector */}
                          <div className="grid grid-cols-3 gap-3">
                            {hospitals.map((hospital) => (
                              <Card
                                key={hospital.id}
                                className={`cursor-pointer transition-all border-2 ${
                                  selectedHospitalId === hospital.id
                                    ? 'border-primary bg-primary/5'
                                    : savedHospitalConfigs[hospital.id]
                                    ? 'border-green-500 bg-green-500/5'
                                    : 'hover:border-primary/50 hover:bg-accent'
                                }`}
                                onClick={() => setSelectedHospitalId(hospital.id)}
                              >
                                <CardHeader className="p-4">
                                  <CardTitle className="text-sm flex items-center justify-between">
                                    <span>{hospital.name}</span>
                                    <div className="flex gap-1">
                                      {savedHospitalConfigs[hospital.id] && (
                                        <Badge variant="default" className="text-xs bg-green-600">✅</Badge>
                                      )}
                                      {selectedHospitalId === hospital.id && (
                                        <Badge variant="default">Selected</Badge>
                                      )}
                                    </div>
                                  </CardTitle>
                                  <CardDescription className="text-xs space-y-1">
                                    <span className="block">{hospital.simulationConfig.totalPatients} patients</span>
                                    {hospital.customBuilding && (
                                      <span className="block">
                                        {hospital.customBuilding.floorCount} floors • {hospital.customBuilding.floors.reduce((sum, f) => sum + f.departments.length, 0)} departments
                                      </span>
                                    )}
                                    {savedHospitalConfigs[hospital.id] ? (
                                      <Badge variant="outline" className="text-xs">
                                        💾 Configuration saved
                                      </Badge>
                                    ) : (
                                      <Badge variant="outline" className="text-xs">
                                        ⚠️ Unsaved
                                      </Badge>
                                    )}
                                  </CardDescription>
                                </CardHeader>
                              </Card>
                            ))}
                          </div>

                          {/* Preview Panel - Info about selected hospital */}
                          {selectedHospitalId && (
                            <Card className="bg-muted/50 border-2">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center gap-2">
                                  <Info className="h-5 w-5 text-primary" />
                                  Preview: {selectedHospital?.name}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="grid grid-cols-2 gap-4 text-sm">
                                  <div>
                                    <p className="font-semibold mb-2">📊 General Configuration</p>
                                    <ul className="space-y-1 text-xs text-muted-foreground">
                                      <li>• Patients: <strong className="text-foreground">{selectedHospital?.simulationConfig.totalPatients}</strong></li>
                                      <li>• Interval: <strong className="text-foreground">{selectedHospital?.simulationConfig.startTime}</strong> - <strong className="text-foreground">{selectedHospital?.simulationConfig.endTime}</strong></li>
                                      {selectedHospital?.customBuilding && (
                                        <>
                                          <li>• Floors: <strong className="text-foreground">{selectedHospital.customBuilding.floorCount}</strong></li>
                                          <li>• Departments: <strong className="text-foreground">{selectedHospital.customBuilding.floors.reduce((sum, f) => sum + f.departments.length, 0)}</strong></li>
                                        </>
                                      )}
                                    </ul>
                                  </div>
                                  <div>
                                    <p className="font-semibold mb-2">👥 Patient Distribution</p>
                                    <ul className="space-y-1 text-xs text-muted-foreground">
                                      <li>🚑 Emergency: <strong className="text-foreground">{selectedHospital?.simulationConfig.patientTypeDistribution?.emergency || 0}%</strong></li>
                                      <li>🚶 Common: <strong className="text-foreground">{selectedHospital?.simulationConfig.patientTypeDistribution?.common || 0}%</strong></li>
                                      <li>🏥 Hospitalized: <strong className="text-foreground">{selectedHospital?.simulationConfig.patientTypeDistribution?.hospitalized || 0}%</strong></li>
                                      <li>📋 Scheduled: <strong className="text-foreground">{selectedHospital?.simulationConfig.patientTypeDistribution?.scheduled_checkup || 0}%</strong></li>
                                    </ul>
                                  </div>
                                </div>

                                {savedHospitalConfigs[selectedHospitalId] ? (
                                  <div className="mt-3 p-2 bg-green-50 dark:bg-green-900/20 rounded border">
                                    <p className="text-xs text-green-800 dark:text-green-200 font-semibold">
                                      ✅ Configuration is saved and will be included in simulation
                                    </p>
                                  </div>
                                ) : (
                                  <div className="mt-3 p-2 bg-orange-50 dark:bg-orange-900/20 rounded border">
                                    <p className="text-xs text-orange-800 dark:text-orange-200 font-semibold">
                                      ⚠️ Don&apos;t forget to press &ldquo;💾 Save Configuration&rdquo; to save changes!
                                    </p>
                                  </div>
                                )}
                              </CardContent>
                            </Card>
                          )}

                          {/* Selected Hospital Configuration - REDESIGNED UI */}
                          {selectedHospitalId && (
                            <Card className="bg-muted/50 border-2">
                              <CardHeader>
                                <div className="flex items-center justify-between">
                                  <div>
                                    <CardTitle className="flex items-center gap-2">
                                      <Building2 className="h-6 w-6 text-primary" />
                                      Edit: {hospitals.find(h => h.id === selectedHospitalId)?.name}
                                      {savedHospitalConfigs[selectedHospitalId] && (
                                        <Badge variant="default" className="ml-2">
                                          ✅ Saved
                                        </Badge>
                                      )}
                                    </CardTitle>
                                    <CardDescription>
                                      {distributionMode === 'custom'
                                        ? 'All settings for this hospital (completely independent)'
                                        : distributionMode === 'manual'
                                        ? 'Settings apply to ALL hospitals'
                                        : 'Automatic configuration (read-only)'}
                                    </CardDescription>
                                  </div>
                                  <div className="flex gap-2">
                                    {/* Save Configuration Button */}
                                    {(distributionMode === 'custom' || distributionMode === 'manual') && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => {
                                          // SAVE REAL CONFIGURATION for this hospital
                                          const currentHospital = hospitals.find(h => h.id === selectedHospitalId);
                                          if (!currentHospital) return;

                                          // Create capacity lookup map to avoid N+1 pattern
                                          const capacityMap = new Map(
                                            config.departmentCapacities.map(dc => [dc.departmentId, dc])
                                          );

                                          // Build custom building from current selectedDepartments
                                          const customFloors: CustomFloorConfig[] = selectedDepartments
                                            .filter(f => f.floorId <= customFloorCount)
                                            .map(f => ({
                                              id: f.floorId,
                                              name: f.floorId === 1 ? 'Ground Floor' : `Floor ${f.floorId - 1}`,
                                              departments: f.departments.map(d => {
                                                const capacityConfig = capacityMap.get(d.id);
                                                return {
                                                  id: d.id,
                                                  name: d.name,
                                                  type: d.type,
                                                  capacity: capacityConfig?.capacity || d.defaultCapacity,
                                                  processingTimeMinutes: capacityConfig?.processingTimeMinutes || d.defaultProcessingTime,
                                                  position: { x: 0, y: 0 },
                                                  color: d.color
                                                };
                                              })
                                            }));

                                          // Update hospital with ACTUAL saved configuration
                                          setHospitals(prev =>
                                            prev.map(h =>
                                              h.id === selectedHospitalId
                                                ? {
                                                    ...h,
                                                    simulationConfig: {
                                                      ...currentHospital.simulationConfig,
                                                      departmentCapacities: [...config.departmentCapacities]
                                                    },
                                                    customBuilding: customFloors.length > 0 ? {
                                                      enabled: true,
                                                      floors: customFloors,
                                                      floorCount: customFloorCount
                                                    } : h.customBuilding
                                                  }
                                                : h
                                            )
                                          );

                                          // Mark as saved (only update if not already saved to prevent no-op re-renders)
                                          setSavedHospitalConfigs(prev => {
                                            if (prev[selectedHospitalId] === true) return prev;
                                            return { ...prev, [selectedHospitalId]: true };
                                          });

                                          // Show success message with details
                                          const savedInfo = [
                                            `✅ Configuration saved for ${currentHospital.name}!`,
                                            ``,
                                            `📊 Saved details:`,
                                            `• Patients: ${currentHospital.simulationConfig.totalPatients}`,
                                            `• Interval: ${currentHospital.simulationConfig.startTime} - ${currentHospital.simulationConfig.endTime}`,
                                            customFloors.length > 0 ? `• Floors: ${customFloorCount}` : null,
                                            customFloors.length > 0 ? `• Departments: ${customFloors.reduce((sum, f) => sum + f.departments.length, 0)}` : null,
                                            ``,
                                            `You can now configure other hospitals.`
                                          ].filter(Boolean).join('\n');

                                          alert(savedInfo);

                                          console.log(`💾 SAVED CONFIG for ${currentHospital.name}:`, {
                                            patients: currentHospital.simulationConfig.totalPatients,
                                            floors: customFloors.length,
                                            departments: customFloors.reduce((sum, f) => sum + f.departments.length, 0),
                                            patientTypes: currentHospital.simulationConfig.patientTypeDistribution
                                          });
                                        }}
                                        className="bg-green-600 hover:bg-green-700"
                                      >
                                        💾 Save Configuration
                                      </Button>
                                    )}

                                    {distributionMode === 'custom' && (
                                      <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={() => {
                                          if (confirm(`Delete ${hospitals.find(h => h.id === selectedHospitalId)?.name}?`)) {
                                            setHospitals(prev => prev.filter(h => h.id !== selectedHospitalId));
                                            const remaining = hospitals.filter(h => h.id !== selectedHospitalId);
                                            setSelectedHospitalId(remaining[0]?.id || null);
                                            setHospitalCount(remaining.length);

                                            // Remove from saved configs
                                            setSavedHospitalConfigs(prev => {
                                              const newConfigs = { ...prev };
                                              delete newConfigs[selectedHospitalId];
                                              return newConfigs;
                                            });
                                          }
                                        }}
                                      >
                                        <Trash2 className="h-4 w-4 mr-2" />
                                        Delete Hospital
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardHeader>

                              <CardContent>
                                {distributionMode === 'auto' ? (
                                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded border">
                                    <p className="text-sm font-semibold text-foreground">🤖 Automatic Mode - Calculated Configuration</p>
                                    <p className="text-xs text-muted-foreground mt-2">
                                      This hospital is configured automatically based on population. Patients: {hospitals.find(h => h.id === selectedHospitalId)?.simulationConfig.totalPatients}
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      To edit manually, change mode to &ldquo;Manual&rdquo; or &ldquo;Custom&rdquo;.
                                    </p>
                                  </div>
                                ) : (
                                  <Accordion type="multiple" defaultValue={["basic", "structure"]} className="w-full">
                                    {/* 1. Basic Settings */}
                                    <AccordionItem value="basic">
                                      <AccordionTrigger className="text-base font-semibold">
                                        <div className="flex items-center gap-2">
                                          <Settings className="h-5 w-5 text-primary" />
                                          Basic Settings
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                          <div>
                                            <Label>Hospital Name</Label>
                                            <Input
                                              value={hospitals.find(h => h.id === selectedHospitalId)?.name || ''}
                                              onChange={(e) => {
                                                const newName = e.target.value;
                                                setHospitals(prev =>
                                                  prev.map(h =>
                                                    distributionMode === 'manual' || h.id === selectedHospitalId
                                                      ? { ...h, name: newName }
                                                      : h
                                                  )
                                                );
                                              }}
                                            />
                                          </div>

                                          <div>
                                            <Label>Patients Total</Label>
                                            <Input
                                              type="number"
                                              value={hospitals.find(h => h.id === selectedHospitalId)?.simulationConfig.totalPatients || 0}
                                              onChange={(e) => {
                                                const newTotal = parseInt(e.target.value) || 0;
                                                setHospitals(prev =>
                                                  prev.map(h =>
                                                    distributionMode === 'manual' || h.id === selectedHospitalId
                                                      ? {
                                                          ...h,
                                                          simulationConfig: {
                                                            ...h.simulationConfig,
                                                            totalPatients: newTotal
                                                          }
                                                        }
                                                      : h
                                                  )
                                                );
                                              }}
                                              min={50}
                                              max={2000}
                                            />
                                          </div>

                                          <div className="grid grid-cols-2 gap-4">
                                            <div>
                                              <Label>Start Time</Label>
                                              <Input
                                                type="time"
                                                value={hospitals.find(h => h.id === selectedHospitalId)?.simulationConfig.startTime || '07:00'}
                                                onChange={(e) => {
                                                  setHospitals(prev =>
                                                    prev.map(h =>
                                                      distributionMode === 'manual' || h.id === selectedHospitalId
                                                        ? {
                                                            ...h,
                                                            simulationConfig: {
                                                              ...h.simulationConfig,
                                                              startTime: e.target.value
                                                            }
                                                          }
                                                        : h
                                                    )
                                                  );
                                                }}
                                              />
                                            </div>
                                            <div>
                                              <Label>End Time</Label>
                                              <Input
                                                type="time"
                                                value={hospitals.find(h => h.id === selectedHospitalId)?.simulationConfig.endTime || '20:00'}
                                                onChange={(e) => {
                                                  setHospitals(prev =>
                                                    prev.map(h =>
                                                      distributionMode === 'manual' || h.id === selectedHospitalId
                                                        ? {
                                                            ...h,
                                                            simulationConfig: {
                                                              ...h.simulationConfig,
                                                              endTime: e.target.value
                                                            }
                                                          }
                                                        : h
                                                    )
                                                  );
                                                }}
                                              />
                                            </div>
                                          </div>

                                          {distributionMode === 'manual' && (
                                            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-800 dark:text-orange-200">
                                              ℹ️ Manual Mode: These settings apply to ALL hospitals from city.
                                            </div>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>

                                    {/* 2. Building Structure */}
                                    <AccordionItem value="structure">
                                      <AccordionTrigger className="text-base font-semibold">
                                        <div className="flex items-center gap-2">
                                          <Building className="h-5 w-5 text-primary" />
                                          Building Structure (Floors + Departments)
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                            <p className="text-sm font-semibold text-foreground">🏗️ Structure Configuration</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              Use the tab <strong>&ldquo;Structure&rdquo;</strong> above to configure floors and departments.
                                            </p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              The settings created there will be saved for {distributionMode === 'custom' ? 'this hospital' : 'all hospitals'}.
                                            </p>
                                          </div>

                                          <Button
                                            variant="outline"
                                            className="w-full"
                                            onClick={() => setActiveTab('structure')}
                                          >
                                            <Building className="h-4 w-4 mr-2" />
                                            Open Tab &ldquo;Structure&rdquo;
                                          </Button>

                                          {hospitals.find(h => h.id === selectedHospitalId)?.customBuilding && (
                                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded border border-green-500">
                                              <p className="text-sm font-semibold text-green-900 dark:text-green-100">✅ Structure Configured</p>
                                              <p className="text-xs text-green-800 dark:text-green-200 mt-1">
                                                • Floors: {hospitals.find(h => h.id === selectedHospitalId)?.customBuilding?.floorCount || 0}
                                              </p>
                                              <p className="text-xs text-green-800 dark:text-green-200">
                                                • Departments: {hospitals.find(h => h.id === selectedHospitalId)?.customBuilding?.floors.reduce((sum, f) => sum + f.departments.length, 0) || 0}
                                              </p>
                                            </div>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>

                                    {/* 3. Patient Distribution */}
                                    <AccordionItem value="patients">
                                      <AccordionTrigger className="text-base font-semibold">
                                        <div className="flex items-center gap-2">
                                          <Users className="h-5 w-5 text-primary" />
                                          Patient Distribution
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                          {/* Patient Type Distribution */}
                                          <div>
                                            <h4 className="font-semibold text-sm mb-3">Patient Types (%)</h4>
                                            <div className="space-y-3">
                                              {(['emergency', 'common', 'hospitalized', 'scheduled_checkup'] as const).map((type) => {
                                                const labels = {
                                                  emergency: '🚑 Emergency',
                                                  common: '🚶 Common',
                                                  hospitalized: '🏥 Hospitalized',
                                                  scheduled_checkup: '📋 Scheduled'
                                                };
                                                const currentHospital = hospitals.find(h => h.id === selectedHospitalId);
                                                const value = currentHospital?.simulationConfig.patientTypeDistribution?.[type] || 0;

                                                return (
                                                  <div key={type}>
                                                    <Label className="text-xs">{labels[type]}</Label>
                                                    <div className="flex items-center gap-2">
                                                      <Slider
                                                        value={[value]}
                                                        onValueChange={([newValue]) => {
                                                          setHospitals(prev =>
                                                            prev.map(h =>
                                                              distributionMode === 'manual' || h.id === selectedHospitalId
                                                                ? {
                                                                    ...h,
                                                                    simulationConfig: {
                                                                      ...h.simulationConfig,
                                                                      patientTypeDistribution: {
                                                                        ...h.simulationConfig.patientTypeDistribution!,
                                                                        [type]: newValue
                                                                      }
                                                                    }
                                                                  }
                                                                : h
                                                            )
                                                          );
                                                        }}
                                                        max={100}
                                                        step={1}
                                                        className="flex-1"
                                                      />
                                                      <span className="text-sm font-mono w-12 text-right">{value}%</span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          <Separator />

                                          {/* Severity Distribution */}
                                          <div>
                                            <h4 className="font-semibold text-sm mb-3">Severity (%)</h4>
                                            <div className="space-y-3">
                                              {(['critical', 'high', 'medium', 'low'] as const).map((severity) => {
                                                const labels = {
                                                  critical: '💀 Critical',
                                                  high: '🔴 High',
                                                  medium: '🟡 Medium',
                                                  low: '🟢 Low'
                                                };
                                                const currentHospital = hospitals.find(h => h.id === selectedHospitalId);
                                                const value = currentHospital?.simulationConfig.severityDistribution?.[severity] || 0;

                                                return (
                                                  <div key={severity}>
                                                    <Label className="text-xs">{labels[severity]}</Label>
                                                    <div className="flex items-center gap-2">
                                                      <Slider
                                                        value={[value]}
                                                        onValueChange={([newValue]) => {
                                                          setHospitals(prev =>
                                                            prev.map(h =>
                                                              distributionMode === 'manual' || h.id === selectedHospitalId
                                                                ? {
                                                                    ...h,
                                                                    simulationConfig: {
                                                                      ...h.simulationConfig,
                                                                      severityDistribution: {
                                                                        ...h.simulationConfig.severityDistribution!,
                                                                        [severity]: newValue
                                                                      }
                                                                    }
                                                                  }
                                                                : h
                                                            )
                                                          );
                                                        }}
                                                        max={100}
                                                        step={1}
                                                        className="flex-1"
                                                      />
                                                      <span className="text-sm font-mono w-12 text-right">{value}%</span>
                                                    </div>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          </div>

                                          {distributionMode === 'manual' && (
                                            <div className="p-2 bg-orange-50 dark:bg-orange-900/20 rounded text-xs text-orange-800 dark:text-orange-200">
                                              ℹ️ Manual Mode: Distributions apply to ALL hospitals.
                                            </div>
                                          )}
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>

                                    {/* 4. Advanced Settings */}
                                    <AccordionItem value="advanced">
                                      <AccordionTrigger className="text-base font-semibold">
                                        <div className="flex items-center gap-2">
                                          <Zap className="h-5 w-5 text-primary" />
                                          Advanced Settings
                                        </div>
                                      </AccordionTrigger>
                                      <AccordionContent>
                                        <div className="space-y-4 p-4 bg-muted/30 rounded-lg">
                                          <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded">
                                            <p className="text-sm font-semibold text-foreground">⚙️ Advanced Configuration</p>
                                            <p className="text-xs text-muted-foreground mt-1">
                                              For complete settings (Specific Diseases, Routing, Random Deviations, etc.), use the corresponding tabs.
                                            </p>
                                          </div>

                                          <div className="grid grid-cols-2 gap-2">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setActiveTab('conditions')}
                                            >
                                              <Bug className="h-3 w-3 mr-2" />
                                              Diseases
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setActiveTab('routing')}
                                            >
                                              <Activity className="h-3 w-3 mr-2" />
                                              Routing
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setActiveTab('departments')}
                                            >
                                              <Building2 className="h-3 w-3 mr-2" />
                                              Capacities
                                            </Button>
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => setActiveTab('advanced')}
                                            >
                                              <Zap className="h-3 w-3 mr-2" />
                                              Advanced
                                            </Button>
                                          </div>
                                        </div>
                                      </AccordionContent>
                                    </AccordionItem>
                                  </Accordion>
                                )}
                              </CardContent>
                            </Card>
                          )}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              </TabsContent>

              {/* Preset Tab */}
              <TabsContent value="preset" className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <span className="text-4xl">{selectedPreset.icon}</span>
                      <div>
                        <CardTitle>{selectedPreset.name}</CardTitle>
                        <CardDescription>{selectedPreset.description}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Basic Settings */}
                    <div className="space-y-4">
                      <div>
                        <Label>Total Number of Patients</Label>
                        <Input
                          type="number"
                          value={config.totalPatients}
                          onChange={(e) => setConfig(prev => ({ ...prev, totalPatients: parseInt(e.target.value) || 0 }))}
                          min={50}
                          max={2000}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label>Start Time</Label>
                          <Input
                            type="time"
                            value={config.startTime}
                            onChange={(e) => setConfig(prev => ({ ...prev, startTime: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            24h Format (ex: 07:00 = 7 AM)
                          </p>
                        </div>
                        <div>
                          <Label>End Time</Label>
                          <Input
                            type="time"
                            value={config.endTime}
                            onChange={(e) => setConfig(prev => ({ ...prev, endTime: e.target.value }))}
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            24h Format (ex: 20:00 = 8 PM, 12:00 = 12 PM lunch)
                          </p>
                        </div>
                      </div>

                      <div>
                        <Label>Name Simulation</Label>
                        <Input
                          value={config.simulationDay}
                          onChange={(e) => setConfig(prev => ({ ...prev, simulationDay: e.target.value }))}
                          placeholder="ex: Crisis Day #1"
                        />
                      </div>
                    </div>

                    <Separator />

                    {/* Preset Overview */}
                    <div className="space-y-3">
                      <h3 className="font-semibold">Preset Configuration:</h3>
                      {selectedPreset.config.patientTypeDistribution && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant="destructive">🚑 {selectedPreset.config.patientTypeDistribution.emergency}%</Badge>
                            <span className="text-muted-foreground">Emergency</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">🚶 {selectedPreset.config.patientTypeDistribution.common}%</Badge>
                            <span className="text-muted-foreground">Common</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="default">🏥 {selectedPreset.config.patientTypeDistribution.hospitalized}%</Badge>
                            <span className="text-muted-foreground">Hospitalized</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">📋 {selectedPreset.config.patientTypeDistribution.scheduled_checkup}%</Badge>
                            <span className="text-muted-foreground">Control</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Structure Tab - NEW! */}
              <TabsContent value="structure" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>🏗️ Hospital Structure</CardTitle>
                    <CardDescription>
                      Configure the number of floors and departments on each floor
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Floor Count Selector */}
                    <div>
                      <Label>Number of Floors</Label>
                      <div className="flex items-center gap-3 mt-2">
                        <Input
                          type="number"
                          value={customFloorCount}
                          onChange={(e) => {
                            const val = parseInt(e.target.value) || 1;
                            const newCount = Math.max(1, Math.min(maxFloors, val));
                            // Only allow if previous floor has departments
                            if (newCount > highestOccupiedFloor + 1) {
                              alert(`⚠️ Cannot create floor ${newCount}!\nFirst add departments on floor ${highestOccupiedFloor + 1}.`);
                              return;
                            }
                            setCustomFloorCount(newCount);
                          }}
                          min={1}
                          max={maxFloors}
                          className="w-24"
                        />
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5, 6].map(num => {
                            const isDisabled = num > highestOccupiedFloor + 1;
                            return (
                              <Button
                                key={num}
                                size="sm"
                                variant={customFloorCount === num ? 'default' : 'outline'}
                                disabled={isDisabled}
                                onClick={() => {
                                  if (num > highestOccupiedFloor + 1) {
                                    alert(`⚠️ Cannot create floor ${num}!\nFirst add departments on floor ${highestOccupiedFloor + 1}.`);
                                    return;
                                  }
                                  setCustomFloorCount(num);
                                }}
                                className={isDisabled ? 'opacity-50 cursor-not-allowed' : ''}
                              >
                                {num}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Active floors: <span className="font-bold">{actualFloorCount}</span> / {maxFloors}
                        {highestOccupiedFloor < customFloorCount && (
                          <span className="text-orange-600"> • Add departments on floor {highestOccupiedFloor + 1} to unlock the next one</span>
                        )}
                      </p>
                    </div>

                    <Separator />

                    {/* Departments per Floor */}
                    <div className="space-y-4">
                      {Array.from({ length: customFloorCount }).map((_, floorIndex) => {
                        const floorId = floorIndex + 1;
                        const floorDepts = selectedDepartments.find(f => f.floorId === floorId)?.departments || [];

                        // Only show floor if:
                        // 1. It has departments, OR
                        // 2. It's the next available floor (highestOccupiedFloor + 1), OR
                        // 3. It's floor 1 (always show)
                        const shouldShowFloor = floorDepts.length > 0 || floorId === highestOccupiedFloor + 1 || floorId === 1;

                        if (!shouldShowFloor) return null;

                        const availableToAdd = AVAILABLE_DEPARTMENTS.filter(
                          d => !floorDepts.some(fd => fd.id === d.id)
                        );

                        return (
                          <Card key={floorId} className="border-2">
                            <CardHeader className="pb-3">
                              <div className="flex items-center justify-between">
                                <div>
                                  <CardTitle className="text-base">
                                    {floorId === 1 ? 'Ground Floor' : `Floor ${floorId - 1}`}
                                  </CardTitle>
                                  <CardDescription className="text-xs">
                                    {floorDepts.length} departments active
                                  </CardDescription>
                                </div>
                                {floorDepts.length === 0 && floorId > 1 && (
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => {
                                      // Remove this floor
                                      setSelectedDepartments(prev => prev.filter(f => f.floorId !== floorId));
                                      // Adjust floor count if necessary
                                      if (floorId === customFloorCount) {
                                        setCustomFloorCount(prev => prev - 1);
                                      }
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {/* List of departments on this floor */}
                              <div className="space-y-2 max-h-48 overflow-y-auto">
                                {floorDepts.map((dept) => (
                                  <div key={dept.id} className="flex items-center gap-2 p-2 bg-muted rounded text-sm">
                                    <Badge style={{ backgroundColor: dept.color }} className="text-white">
                                      {dept.type}
                                    </Badge>
                                    <span className="flex-1 font-medium">{dept.name}</span>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={() => {
                                        const newDepts = floorDepts.filter(d => d.id !== dept.id);

                                        // If this is the last department on a non-ground floor, warn user
                                        if (newDepts.length === 0 && floorId > 1) {
                                          const confirm = window.confirm(
                                            `⚠️ Deleting this department will leave floor ${floorId === 1 ? 'Ground Floor' : `Floor ${floorId - 1}`} empty.\n\n` +
                                            `The floor will disappear from the list. Continue?`
                                          );
                                          if (!confirm) return;
                                        }

                                        setSelectedDepartments(prev =>
                                          prev.map(f =>
                                            f.floorId === floorId
                                              ? { ...f, departments: newDepts }
                                              : f
                                          )
                                        );
                                      }}
                                    >
                                      <Trash2 className="h-3 w-3" />
                                    </Button>
                                  </div>
                                ))}
                              </div>

                              {/* Add department dropdown */}
                              {availableToAdd.length > 0 && (
                                <div className="pt-2">
                                  <select
                                    className="w-full p-2 text-sm border rounded"
                                    onChange={(e) => {
                                      const deptId = e.target.value;
                                      if (!deptId) return;

                                      const deptToAdd = AVAILABLE_DEPARTMENTS.find(d => d.id === deptId);
                                      if (!deptToAdd) return;

                                      setSelectedDepartments(prev => {
                                        const existing = prev.find(f => f.floorId === floorId);
                                        if (existing) {
                                          return prev.map(f =>
                                            f.floorId === floorId
                                              ? { ...f, departments: [...f.departments, deptToAdd] }
                                              : f
                                          );
                                        } else {
                                          return [...prev, { floorId, departments: [deptToAdd] }];
                                        }
                                      });

                                      e.target.value = '';
                                    }}
                                    defaultValue=""
                                  >
                                    <option value="">+ Add department...</option>
                                    {availableToAdd.map(dept => (
                                      <option key={dept.id} value={dept.id}>
                                        {dept.name} ({dept.type})
                                      </option>
                                    ))}
                                  </select>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>

                    <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg text-sm">
                      <div className="flex gap-2">
                        <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                        <div className="space-y-1">
                          <p className="font-semibold text-foreground">Adjust Hospital Structure</p>
                          <p className="text-blue-700 dark:text-blue-200 text-xs">
                            Structure modifications will generate a custom hospital. Individual capacities can be set in the tab &ldquo;Departments&rdquo;.
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Patients Tab */}
              <TabsContent value="patients" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Distribution Types Patients</CardTitle>
                    <CardDescription>
                      Total: {totalPatientTypePercent}%
                      {totalPatientTypePercent !== 100 && (
                        <span className="text-orange-500 ml-2">⚠️ Must be 100%</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Emergency */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>🚑 Emergency (Ambulance)</Label>
                        <span className="font-bold">{config.patientTypeDistribution?.emergency}%</span>
                      </div>
                      <Slider
                        value={[config.patientTypeDistribution?.emergency || 0]}
                        onValueChange={([v]) => updatePatientType('emergency', v)}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>

                    {/* Common */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>🚶 Common (Walk-in)</Label>
                        <span className="font-bold">{config.patientTypeDistribution?.common}%</span>
                      </div>
                      <Slider
                        value={[config.patientTypeDistribution?.common || 0]}
                        onValueChange={([v]) => updatePatientType('common', v)}
                        max={100}
                        step={1}
                      />
                    </div>

                    {/* Hospitalized */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>🏥 Internat</Label>
                        <span className="font-bold">{config.patientTypeDistribution?.hospitalized}%</span>
                      </div>
                      <Slider
                        value={[config.patientTypeDistribution?.hospitalized || 0]}
                        onValueChange={([v]) => updatePatientType('hospitalized', v)}
                        max={100}
                        step={1}
                      />
                    </div>

                    {/* Scheduled */}
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <Label>📋 Scheduled Checkup</Label>
                        <span className="font-bold">{config.patientTypeDistribution?.scheduled_checkup}%</span>
                      </div>
                      <Slider
                        value={[config.patientTypeDistribution?.scheduled_checkup || 0]}
                        onValueChange={([v]) => updatePatientType('scheduled_checkup', v)}
                        max={100}
                        step={1}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Distribution Severity</CardTitle>
                    <CardDescription>
                      Total: {totalSeverityPercent}%
                      {totalSeverityPercent !== 100 && (
                        <span className="text-orange-500 ml-2">⚠️ Must be 100%</span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {(['critical', 'high', 'medium', 'low'] as const).map(severity => (
                      <div key={severity} className="space-y-2">
                        <div className="flex justify-between">
                          <Label>
                            {severity === 'critical' && '🔴 Critic'}
                            {severity === 'high' && '🟠 Ridicat'}
                            {severity === 'medium' && '🟡 Mediu'}
                            {severity === 'low' && '🟢 Low'}
                          </Label>
                          <span className="font-bold">{config.severityDistribution?.[severity]}%</span>
                        </div>
                        <Slider
                          value={[config.severityDistribution?.[severity] || 0]}
                          onValueChange={([v]) => updateSeverity(severity, v)}
                          max={100}
                          step={1}
                        />
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Departments Tab */}
              <TabsContent value="departments" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Capacities Departments</CardTitle>
                    <CardDescription>Configure capacity and processing time for each department</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4 max-h-[600px] overflow-y-auto">
                      {building.floors.map(floor => (
                        <div key={floor.id}>
                          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-2">{floor.name}</h3>
                          <div className="space-y-3 ml-4">
                            {floor.departments.map(dept => {
                              const deptConfig = config.departmentCapacities.find(d => d.departmentId === dept.id);
                              return (
                                <div key={dept.id} className="border rounded-lg p-3 space-y-2">
                                  <div className="flex justify-between items-center">
                                    <span className="font-medium text-sm">{dept.name}</span>
                                    <Badge variant="outline">{dept.id}</Badge>
                                  </div>
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs">Capacity</Label>
                                      <Input
                                        type="number"
                                        value={deptConfig?.capacity || 5}
                                        onChange={(e) => updateDepartmentCapacity(dept.id, 'capacity', parseInt(e.target.value) || 1)}
                                        min={1}
                                        max={50}
                                        className="h-8"
                                      />
                                    </div>
                                    <div>
                                      <Label className="text-xs">Timp (minute)</Label>
                                      <Input
                                        type="number"
                                        value={deptConfig?.processingTimeMinutes || 30}
                                        onChange={(e) => updateDepartmentCapacity(dept.id, 'processingTimeMinutes', parseInt(e.target.value) || 1)}
                                        min={5}
                                        max={300}
                                        className="h-8"
                                      />
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Conditions Tab */}
              <TabsContent value="conditions" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Specific Medical Conditions</CardTitle>
                    <CardDescription>
                      Force a specific number of patients with certain conditions
                      {totalSpecificPatients > 0 && (
                        <span className="ml-2 text-blue-600 font-semibold">
                          ({totalSpecificPatients} din {config.totalPatients} patients)
                        </span>
                      )}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Selected Conditions */}
                    {config.specificConditions && config.specificConditions.length > 0 && (
                      <div className="space-y-2">
                        {config.specificConditions.map((condition, idx) => (
                          <div key={idx} className="flex items-center justify-between border rounded-lg p-3">
                            <div className="flex-1">
                              <div className="font-medium">{condition.conditionName}</div>
                              <div className="text-sm text-gray-600 dark:text-gray-300">{condition.patientCount} patients</div>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeCondition(idx)}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        ))}
                        <Separator />
                      </div>
                    )}

                    {/* Add New Condition */}
                    <div className="space-y-3">
                      <h4 className="font-semibold text-sm">Add New Condition:</h4>
                      <div className="grid grid-cols-2 gap-2 max-h-[400px] overflow-y-auto">
                        {allConditions.map(condition => (
                          <Button
                            key={condition.name}
                            variant="outline"
                            size="sm"
                            className="justify-start h-auto py-2"
                            onClick={() => {
                              const count = Math.ceil(config.totalPatients * (condition.prevalence / 100));
                              addCondition(condition.name, count);
                            }}
                          >
                            <div className="text-left">
                              <div className="font-medium text-xs">{condition.name}</div>
                              <div className="text-xs text-gray-500">
                                {condition.mortalityRate}% mortalitate, +{condition.mortalityIncreasePerHour}%/h
                              </div>
                            </div>
                          </Button>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Routing Tab */}
              <TabsContent value="routing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Filtre Routing Departments</CardTitle>
                    <CardDescription>Select departments that MUST be used in patient routes</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {building.floors.map(floor => (
                        <div key={floor.id}>
                          <h3 className="font-semibold text-sm text-gray-700 dark:text-gray-200 mb-2">{floor.name}</h3>
                          <div className="grid grid-cols-2 gap-2 ml-4">
                            {floor.departments.map(dept => {
                              const isFiltered = config.departmentFilters?.some(f => f.departmentId === dept.id);
                              return (
                                <Button
                                  key={dept.id}
                                  variant={isFiltered ? 'default' : 'outline'}
                                  size="sm"
                                  onClick={() => toggleDepartmentFilter(dept.id)}
                                  className="justify-start"
                                >
                                  {isFiltered && '✓ '}
                                  {dept.name}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>

                    {config.departmentFilters && config.departmentFilters.length > 0 && (
                      <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                        <div className="flex items-start gap-2">
                          <Info className="h-4 w-4 text-blue-600 mt-0.5" />
                          <p className="text-sm text-blue-800 dark:text-blue-200">
                            Only patients with routes through these departments will be generated.
                            Departments selectate: {config.departmentFilters.length}
                          </p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Advanced Tab */}
              <TabsContent value="advanced" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Devieri Random</CardTitle>
                    <CardDescription>Add variabilitate pentru rezultate mai realiste</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <Label>Activate Random Deviations</Label>
                      <Switch
                        checked={config.randomDeviation?.enabled}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          randomDeviation: { ...prev.randomDeviation!, enabled: checked }
                        }))}
                      />
                    </div>

                    {config.randomDeviation?.enabled && (
                      <>
                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label>Schimbare Severity</Label>
                            <span className="font-bold">{(config.randomDeviation?.severityShift || 0) > 0 ? '+' : ''}{config.randomDeviation?.severityShift || 0}%</span>
                          </div>
                          <Slider
                            value={[config.randomDeviation.severityShift || 0]}
                            onValueChange={([v]) => setConfig(prev => ({
                              ...prev,
                              randomDeviation: { ...prev.randomDeviation!, severityShift: v }
                            }))}
                            min={-30}
                            max={30}
                            step={5}
                          />
                          <p className="text-xs text-gray-500">Negative = fewer severe cases | Positive = more severe cases</p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label>Multiplicator Mortalitate</Label>
                            <span className="font-bold">{config.randomDeviation.mortalityMultiplier}x</span>
                          </div>
                          <Slider
                            value={[config.randomDeviation.mortalityMultiplier || 1.0]}
                            onValueChange={([v]) => setConfig(prev => ({
                              ...prev,
                              randomDeviation: { ...prev.randomDeviation!, mortalityMultiplier: v }
                            }))}
                            min={0.5}
                            max={2.0}
                            step={0.1}
                          />
                        </div>

                        <div className="space-y-2">
                          <div className="flex justify-between">
                            <Label>Patient Number Variance</Label>
                            <span className="font-bold">±{config.randomDeviation.patientCountVariance}%</span>
                          </div>
                          <Slider
                            value={[config.randomDeviation.patientCountVariance || 0]}
                            onValueChange={([v]) => setConfig(prev => ({
                              ...prev,
                              randomDeviation: { ...prev.randomDeviation!, patientCountVariance: v }
                            }))}
                            min={0}
                            max={50}
                            step={5}
                          />
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Advanced Settings</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label>Peak Hour Multiplier</Label>
                      <Input
                        type="number"
                        value={config.advancedSettings?.peakHourMultiplier || 1.5}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          advancedSettings: { ...prev.advancedSettings!, peakHourMultiplier: parseFloat(e.target.value) || 1.5 }
                        }))}
                        min={1}
                        max={3}
                        step={0.1}
                      />
                      <p className="text-xs text-gray-500">More patients during hours 8:00-12:00</p>
                    </div>

                    <div className="flex items-center justify-between">
                      <Label>Use All Departments</Label>
                      <Switch
                        checked={config.advancedSettings?.useAllDepartments}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          advancedSettings: { ...prev.advancedSettings!, useAllDepartments: checked }
                        }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Minimum Queue Length</Label>
                      <Input
                        type="number"
                        value={config.advancedSettings?.minimumQueueLength || 0}
                        onChange={(e) => setConfig(prev => ({
                          ...prev,
                          advancedSettings: { ...prev.advancedSettings!, minimumQueueLength: parseInt(e.target.value) || 0 }
                        }))}
                        min={0}
                        max={10}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Action Buttons */}
            <Card className="mt-6">
              <CardContent className="pt-6">
                <div className="flex justify-between items-center">
                  <div className="text-sm text-gray-600 dark:text-gray-300">
                    {totalPatientTypePercent !== 100 || totalSeverityPercent !== 100 ? (
                      <div className="flex items-center gap-2 text-orange-600">
                        <AlertCircle className="h-4 w-4" />
                        <span>Check distributions (must be 100%)</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600">
                        <span>✓</span>
                        <span>Valid configuration</span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-3">
                    {onCancel && (
                      <Button variant="outline" onClick={onCancel}>
                        Cancel
                      </Button>
                    )}
                    <Button
                      onClick={() => {
                        // Validate saved configurations in custom mode
                        if (cityEnabled && distributionMode === 'custom') {
                          const unsavedHospitals = hospitals.filter(h => !savedHospitalConfigs[h.id]);
                          if (unsavedHospitals.length > 0) {
                            alert(`⚠️ ERROR: Some hospitals don't have saved configuration!\n\n` +
                              `Unsaved hospitals:\n${unsavedHospitals.map(h => `• ${h.name}`).join('\n')}\n\n` +
                              `Please configure and save each hospital with the button "💾 Save Configuration".`);
                            return;
                          }
                        }

                        // Validate time range
                        const [startH, startM] = config.startTime.split(':').map(Number);
                        const [endH, endM] = config.endTime.split(':').map(Number);
                        const startMinutes = startH * 60 + startM;
                        const endMinutes = endH * 60 + endM;

                        if (endMinutes <= startMinutes) {
                          alert('⚠️ End time must be after start time!\n\nExample:\nStart: 07:00\nEnd: 20:00');
                          return;
                        }

                        // Build custom building config
                        const customFloors: CustomFloorConfig[] = selectedDepartments
                          .filter(f => f.floorId <= customFloorCount)
                          .map(f => ({
                            id: f.floorId,
                            name: f.floorId === 1 ? 'Ground Floor' : `Floor ${f.floorId - 1}`,
                            departments: f.departments.map(d => ({
                              id: d.id,
                              name: d.name,
                              type: d.type,
                              capacity: config.departmentCapacities.find(dc => dc.departmentId === d.id)?.capacity || d.defaultCapacity,
                              processingTimeMinutes: config.departmentCapacities.find(dc => dc.departmentId === d.id)?.processingTimeMinutes || d.defaultProcessingTime,
                              position: { x: 0, y: 0 }, // Will be auto-positioned
                              color: d.color
                            }))
                          }));

                        // Build city config if enabled
                        let cityConfig: CityConfig | undefined;
                        if (cityEnabled && hospitals.length > 0) {
                          cityConfig = {
                            enabled: true,
                            cityName,
                            population: cityPopulation,
                            hospitalCount,
                            averageDistanceBetweenHospitals: avgDistance,
                            distributionMode,
                            // In custom mode, use SAVED configurations for each hospital
                            // In manual/auto mode, all hospitals use the same config
                            hospitals: hospitals.map(h => ({
                              ...h,
                              // Use the hospital's OWN customBuilding (already saved via Save button)
                              // Don't overwrite with current selectedHospitalId config
                              customBuilding: h.customBuilding
                            }))
                          };
                        }

                        const finalConfig = {
                          ...config,
                          customBuilding: cityEnabled ? undefined : {
                            enabled: true,
                            floors: customFloors,
                            floorCount: customFloorCount
                          },
                          cityConfig
                        };

                        onStartSimulation(finalConfig);
                      }}
                      disabled={
                        totalPatientTypePercent !== 100 ||
                        totalSeverityPercent !== 100 ||
                        (cityEnabled && distributionMode === 'custom' && hospitals.some(h => !savedHospitalConfigs[h.id]))
                      }
                      className="gap-2"
                    >
                      Start Simulation {cityEnabled && `(${hospitals.length} Hospitals)`}
                      {cityEnabled && distributionMode === 'custom' && hospitals.some(h => !savedHospitalConfigs[h.id]) && (
                        <span className="ml-2 text-xs">(⚠️ Save all hospitals)</span>
                      )}
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
