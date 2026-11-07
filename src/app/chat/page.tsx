import Chat from '@/components/chat';
export default function Page(){return <Chat configured={Boolean(process.env.GEMINI_API_KEY)}/>;}
