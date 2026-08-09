import { supabase } from '@/lib/supabase'

export interface Pet {
  id: number
  customer_id: string
  name: string
  species: string
  breed: string | null
  age: number | null
  weight: number | null
  diet: string | null
  created_at: string
}

export interface PetInput {
  name: string
  species: string
  breed: string | null
  age: number | null
  weight: number | null
  diet: string | null
}

export async function fetchPets(): Promise<Pet[]> {
  const { data, error } = await supabase.from('pet_profiles').select('*').order('created_at')

  if (error) throw error
  return data as Pet[]
}

export async function createPet(customerId: string, input: PetInput): Promise<Pet> {
  const { data, error } = await supabase
    .from('pet_profiles')
    .insert({ ...input, customer_id: customerId })
    .select()
    .single()

  if (error) throw error
  return data as Pet
}

export async function updatePet(id: number, input: PetInput): Promise<Pet> {
  const { data, error } = await supabase
    .from('pet_profiles')
    .update(input)
    .eq('id', id)
    .select()
    .single()

  if (error) throw error
  return data as Pet
}

export async function deletePet(id: number): Promise<void> {
  const { error } = await supabase.from('pet_profiles').delete().eq('id', id)
  if (error) throw error
}
