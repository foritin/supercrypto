'use client'
/**
 * Data Reset Panel Component
 * Developer tool for resetting test data
 * 
 * Migrated from Ant Design to shadcn/ui
 * @validates Requirements 16.12
 */
import { useState, useEffect, useCallback } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2, AlertTriangle, AlertCircle, RefreshCw, Loader2 } from 'lucide-react'

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogFooter,
  AlertDialogCancel,
} from '@/components/ui/alert-dialog'
import { notification } from '@/lib/notification'
import { devToolsService, type ResetableDataInfo, type DataResetRequest } from '@/services/dev-tools'

type DataType = 'kyc' | 'transaction' | 'all'

export function DataResetPanel() {
  const { t } = useTranslation()
  
  const [selectedTypes, setSelectedTypes] = useState<DataType[]>(['all'])
  const [confirmText, setConfirmText] = useState('')
  const [isModalOpen, setIsModalOpen] = useState(false)
  
  // Data state
  const [resetInfo, setResetInfo] = useState<ResetableDataInfo | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isResetting, setIsResetting] = useState(false)

  // Fetch resetable data info
  const fetchResetInfo = useCallback(async () => {
    setIsLoading(true)
    try {
      const data = await devToolsService.getResetInfo()
      setResetInfo(data)
    } catch (err) {
      console.error('Failed to fetch reset info:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const refetch = fetchResetInfo

  useEffect(() => {
    fetchResetInfo()
  }, [fetchResetInfo])

  // Reset data
  const handleReset = async (request: DataResetRequest) => {
    setIsResetting(true)
    try {
      await devToolsService.resetData(request)
      notification.success(t('dev.dataReset.success'))
      setIsModalOpen(false)
      setConfirmText('')
      refetch()
    } catch (error) {
      notification.error((error as Error).message || t('common.error'))
    } finally {
      setIsResetting(false)
    }
  }

  // Handle checkbox change
  const handleTypeChange = (type: DataType, checked: boolean) => {
    if (type === 'all') {
      setSelectedTypes(checked ? ['all'] : [])
    } else {
      let newTypes = selectedTypes.filter(t => t !== 'all')
      if (checked) {
        newTypes.push(type)
      } else {
        newTypes = newTypes.filter(t => t !== type)
      }
      setSelectedTypes(newTypes)
    }
  }

  // Open confirmation modal
  const handleResetClick = () => {
    if (selectedTypes.length === 0) {
      notification.warning(t('dev.dataReset.selectType'))
      return
    }
    setIsModalOpen(true)
  }

  // Execute reset
  const handleConfirmReset = () => {
    if (confirmText !== 'RESET') {
      notification.error(t('dev.dataReset.confirmError'))
      return
    }
    
    handleReset({
      confirmation: 'RESET',
      data_types: selectedTypes,
    })
  }

  const isAllSelected = selectedTypes.includes('all')

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Trash2 className="h-4 w-4" />
          {t('dev.dataReset.title')}
        </CardTitle>
        <Button 
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="h-4 w-4" />
          )}
          <span className="ml-1">{t('common.refresh')}</span>
        </Button>
      </CardHeader>
      
      <CardContent className="flex flex-col gap-4">
        {/* Warning Alert */}
        <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div className="flex flex-col gap-1">
            <span className="font-medium text-red-500">
              {t('dev.dataReset.warning')}
            </span>
            <span className="text-sm text-muted-foreground">
              {t('dev.dataReset.warningDescription')}
            </span>
          </div>
        </div>

        {/* Data Statistics */}
        {resetInfo && (
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1 p-4 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm text-muted-foreground">
                {t('dev.dataReset.kycRecords')}
              </span>
              <span className="text-2xl font-semibold text-foreground">
                {resetInfo.kyc_count}
              </span>
            </div>
            <div className="flex flex-col gap-1 p-4 rounded-lg bg-white/5 border border-white/10">
              <span className="text-sm text-muted-foreground">
                {t('dev.dataReset.transactionRecords')}
              </span>
              <span className="text-2xl font-semibold text-foreground">
                {resetInfo.transaction_count}
              </span>
            </div>
          </div>
        )}

        {/* Data Type Selection */}
        <div className="flex flex-col gap-2">
          <span className="font-medium text-foreground">
            {t('dev.dataReset.selectDataTypes')}:
          </span>
          <div className="flex flex-col gap-3 mt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={isAllSelected}
                onCheckedChange={(checked) => handleTypeChange('all', checked === true)}
              />
              <span className="text-sm">{t('dev.dataReset.allData')}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedTypes.includes('kyc') || isAllSelected}
                disabled={isAllSelected}
                onCheckedChange={(checked) => handleTypeChange('kyc', checked === true)}
              />
              <span className="text-sm">
                {t('dev.dataReset.kycData')} ({resetInfo?.kyc_count || 0})
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <Checkbox
                checked={selectedTypes.includes('transaction') || isAllSelected}
                disabled={isAllSelected}
                onCheckedChange={(checked) => handleTypeChange('transaction', checked === true)}
              />
              <span className="text-sm">
                {t('dev.dataReset.transactionData')} ({resetInfo?.transaction_count || 0})
              </span>
            </label>
          </div>
        </div>

        {/* Reset Button */}
        <Button
          variant="destructive"
          onClick={handleResetClick}
          disabled={selectedTypes.length === 0}
          className="w-full"
        >
          <Trash2 className="h-4 w-4 mr-2" />
          {t('dev.dataReset.resetButton')}
        </Button>

        <p className="text-xs text-muted-foreground">
          {t('dev.dataReset.note')}
        </p>
      </CardContent>

      {/* Confirmation AlertDialog */}
      <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              {t('dev.dataReset.confirmTitle')}
            </AlertDialogTitle>
          </AlertDialogHeader>
          
          <div className="flex flex-col gap-4">
            {/* Confirm Warning */}
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <span className="text-sm text-red-500">
                {t('dev.dataReset.confirmWarning')}
              </span>
            </div>
            
            {/* Confirm Input */}
            <div className="flex flex-col gap-2">
              <span className="text-sm text-foreground">
                {t('dev.dataReset.confirmPrompt')}
              </span>
              <Input
                placeholder="RESET"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value.toUpperCase())}
              />
            </div>
            
            {/* Will Delete List */}
            <div className="flex flex-col gap-2">
              <span className="font-medium text-foreground">
                {t('dev.dataReset.willDelete')}:
              </span>
              <ul className="list-disc list-inside text-sm text-muted-foreground ml-2">
                {(isAllSelected || selectedTypes.includes('kyc')) && (
                  <li>{t('dev.dataReset.kycData')}</li>
                )}
                {(isAllSelected || selectedTypes.includes('transaction')) && (
                  <li>{t('dev.dataReset.transactionData')}</li>
                )}
              </ul>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmText('')}>
              {t('common.cancel')}
            </AlertDialogCancel>
            <Button
              variant="destructive"
              onClick={handleConfirmReset}
              disabled={confirmText !== 'RESET' || isResetting}
            >
              {isResetting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {t('dev.dataReset.confirmButton')}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  )
}
