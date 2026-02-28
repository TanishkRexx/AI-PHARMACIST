import { useState } from "react"
import { motion } from "framer-motion"
import {
  Brain,
  Pill,
  Shield,
  Search,
  Activity,
  Sparkles,
  Database
} from "lucide-react"

export default function AgentArchitecture() {

  const agents = [
    {
      id:"pharmacy",
      name:"PharmacyAI",
      icon:<Pill size={18}/>,
      desc:"Handles pharmacy inventory intelligence and order orchestration.",
      latency:"25ms",
      load:"18%",
      uptime:"99.8%"
    },
    {
      id:"health",
      name:"HealthProfileAgent",
      icon:<Brain size={18}/>,
      desc:"Maintains patient health profile and therapy continuity.",
      latency:"22ms",
      load:"14%",
      uptime:"99.9%"
    },
    {
      id:"analytics",
      name:"AnalyticsAgent",
      icon:<Activity size={18}/>,
      desc:"Analyzes therapy trends and patient behaviour insights.",
      latency:"28ms",
      load:"20%",
      uptime:"99.7%"
    },
    {
      id:"recommend",
      name:"RecommendationAgent",
      icon:<Sparkles size={18}/>,
      desc:"Suggests medicines and therapy improvements.",
      latency:"26ms",
      load:"15%",
      uptime:"99.8%"
    },
    {
      id:"semantic",
      name:"SemanticSearchAgent",
      icon:<Search size={18}/>,
      desc:"Performs intelligent medical search across symptoms.",
      latency:"20ms",
      load:"12%",
      uptime:"99.9%"
    },
    {
      id:"safety",
      name:"SafetyAgent",
      icon:<Shield size={18}/>,
      desc:"Detects drug interactions and allergy risks.",
      latency:"23ms",
      load:"10%",
      uptime:"99.99%"
    },
    {
      id:"medicine",
      name:"MedicineAgent",
      icon:<Database size={18}/>,
      desc:"Maintains the medicine knowledge graph database.",
      latency:"21ms",
      load:"13%",
      uptime:"99.9%"
    }
  ]

  const [selected,setSelected] = useState(agents[1])

  const radius = 200

  return (

<section className="py-24 bg-gradient-to-r from-[#60c4dc] via-[#7bd0e4] to-[#a9e5f5]">

<div className="max-w-7xl mx-auto px-6">

{/* TITLE */}

<motion.div
initial={{opacity:0,y:40}}
whileInView={{opacity:1,y:0}}
viewport={{once:true}}
className="mb-16 text-center"
>

<p className="text-xs text-blue-700 tracking-widest mb-3 font-semibold">
NEURAL ARCHITECTURE
</p>

<h2 className="text-5xl font-bold mb-4 text-gray-900">
Autonomous Agent Hub
</h2>

<p className="text-gray-700 max-w-xl mx-auto">
Specialized AI agents operate autonomously and synchronize through the neural core.
</p>

</motion.div>


<div className="grid lg:grid-cols-2 gap-16 items-center">


{/* LEFT SIDE HUB */}

<div className="bg-gray-100 rounded-3xl p-10 flex items-center justify-center relative h-[500px] shadow-inner">


{/* Brain Core */}

<motion.div
animate={{scale:[1,1.07,1]}}
transition={{duration:4,repeat:Infinity}}
className="absolute w-28 h-28 rounded-full bg-white shadow-xl flex items-center justify-center border"
>

<Brain size={36} className="text-blue-600"/>

</motion.div>


{/* Agents */}

{agents.map((agent,index)=>{

const angle = (index / agents.length) * Math.PI * 2
const x = radius * Math.cos(angle)
const y = radius * Math.sin(angle)

return(

<motion.div
key={agent.id}
initial={{opacity:0}}
animate={{opacity:1}}
transition={{delay:index*0.1}}
onClick={()=>setSelected(agent)}
className="absolute cursor-pointer"
style={{
transform:`translate(${x}px,${y}px)`
}}
>

<div className={`flex flex-col items-center gap-1 px-3 py-2 rounded-xl text-xs transition duration-200
${selected.id===agent.id 
? "bg-white shadow-lg border border-blue-200 scale-105"
: "bg-gray-50 hover:bg-white border"}
`}>

<div className="p-2 rounded-lg bg-blue-50 text-blue-600">
{agent.icon}
</div>

<p className="text-gray-700 text-[11px] font-medium">
{agent.name}
</p>

</div>

</motion.div>

)

})}

</div>


{/* RIGHT SIDE INFO PANEL */}

<motion.div
key={selected.id}
initial={{opacity:0,x:40}}
animate={{opacity:1,x:0}}
className="bg-gray-200 rounded-3xl p-8 shadow-xl"
>

<div className="flex items-center gap-3 mb-6">

<div className="p-3 rounded-xl bg-white shadow">
{selected.icon}
</div>

<div>

<h3 className="text-xl font-semibold text-gray-900">
{selected.name}
</h3>

<p className="text-xs text-gray-600">
AI AGENT NODE
</p>

</div>

</div>


<p className="text-gray-700 mb-8">
{selected.desc}
</p>


{/* Stats */}

<div className="grid grid-cols-3 gap-4 mb-8">

<div className="bg-white rounded-xl p-4 text-center shadow">
<p className="text-xs text-gray-500">Latency</p>
<p className="text-lg font-bold">{selected.latency}</p>
</div>

<div className="bg-white rounded-xl p-4 text-center shadow">
<p className="text-xs text-gray-500">Load</p>
<p className="text-lg font-bold">{selected.load}</p>
</div>

<div className="bg-white rounded-xl p-4 text-center shadow">
<p className="text-xs text-gray-500">Uptime</p>
<p className="text-lg font-bold">{selected.uptime}</p>
</div>

</div>


{/* Logs */}

<div className="bg-gray-900 rounded-xl p-4 font-mono text-xs text-green-400">
<p>INITIALIZING NEURAL MODULE...</p>
<p>SYNCING DATA PACKETS...</p>
<p>WAITING NEXT ACTION TRIGGER...</p>
</div>

</motion.div>


</div>

</div>

</section>

)
}