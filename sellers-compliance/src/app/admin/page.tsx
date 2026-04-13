import { getCommandCenterData } from '@/lib/queries/command-center'
import { CommandCenter } from '@/components/admin/command-center/CommandCenter'

export default async function AdminPage() {
  const data = await getCommandCenterData()

  return <CommandCenter data={data} />
}
