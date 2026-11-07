import FoodLens from '@/components/food-lens';
export default function Page(){return <FoodLens configured={Boolean(process.env.GEMINI_API_KEY)}/>;}
