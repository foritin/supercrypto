"use client";

import { Cable } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { parseAbi } from "viem";
import { useAccount, useWalletClient, usePublicClient, useChainId } from "wagmi";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { notification } from "@/lib/notification";
import {
  contractAdminService,
  CONTRACT_SET_ABIS,
} from "@/services/contract";
import { transactionAuditService } from "@/services/transaction-audit";
import type { ContractStatusItem, DependencyStatusItem } from "@/types/contract";


// 表单类型定义
interface UpdateFormValues {
  setFunction: string;
  newAddress: string;
}

interface ContractDetailProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedContract: ContractStatusItem | null;
  selectedDependency: DependencyStatusItem | null;
  onSuccess: () => void;
}

export function ContractDetail({
  open,
  onOpenChange,
  selectedContract,
  selectedDependency,
  onSuccess,
}: ContractDetailProps) {
  const { t } = useTranslation();
  const { chain, address } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();

  const [isUpdating, setIsUpdating] = useState(false);

  // react-hook-form
  const form = useForm<UpdateFormValues>({
    defaultValues: {
      setFunction: selectedDependency?.key || "",
      newAddress: selectedDependency?.address || "",
    },
  });

  // 更新地址
  const handleUpdate = async (values: UpdateFormValues) => {
    if (!selectedContract || !walletClient || !publicClient || !address) {
      notification.error("Invalid state");
      return;
    }

    setIsUpdating(true);
    try {
      const callInfo = await contractAdminService.updateContractAddress({
        target_contract: selectedContract.name,
        set_function: values.setFunction,
        new_address: values.newAddress,
      });

      const abiStrings = CONTRACT_SET_ABIS[values.setFunction];
      if (!abiStrings) {
        notification.error("Unknown set function");
        return;
      }
      const abi = parseAbi(abiStrings);

      const hash = await walletClient.writeContract({
        address: callInfo.target_address as `0x${string}`,
        abi,
        functionName: values.setFunction,
        args: [values.newAddress as `0x${string}`],
      });

      // 记录 Admin 合约操作到审计日志
      transactionAuditService.recordAdminContractCall({
        txHash: hash,
        chainId: chainId,
        network: chain?.name || "hardhat",
        fromAddress: address,
        contractAddress: callInfo.target_address,
        contractName: selectedContract.name,
        functionName: values.setFunction,
        functionArgs: { newAddress: values.newAddress },
        description: `[Admin] Set ${values.setFunction.replace("set", "")} to ${values.newAddress.slice(0, 10)}...`,
      });

      const receipt = await publicClient.waitForTransactionReceipt({ hash });

      // 更新交易状态
      transactionAuditService.updateStatus(hash, "confirmed", {
        block_number: Number(receipt.blockNumber),
        gas_used: Number(receipt.gasUsed),
        effective_gas_price: receipt.effectiveGasPrice?.toString(),
      });

      const depName =
        selectedDependency?.contract ||
        values.setFunction
          .replace("set", "")
          .replace("KYCManager", "KYCManager");

      await contractAdminService.confirmBinding({
        contract_name: selectedContract.name,
        dependency_name: depName,
        tx_hash: hash,
        new_address: values.newAddress,
      });

      notification.success(
        `${t("admin.contracts.updateSuccess")} TX: ${hash.slice(0, 10)}...`
      );
      onOpenChange(false);
      form.reset();
      onSuccess();
    } catch (error) {
      notification.error(
        `${t("admin.contracts.updateFailed")}: ${(error as Error).message}`
      );
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      onOpenChange(isOpen);
      if (!isOpen) {
        form.reset();
      }
    }}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("admin.contracts.updateModal.title")}</DialogTitle>
        </DialogHeader>
        
        {selectedDependency && (
          <Alert variant="info" className="mb-4">
            <Cable className="h-4 w-4" />
            <AlertTitle>{t("admin.contracts.updateModal.info")}</AlertTitle>
            <AlertDescription>
              <div className="mt-2 space-y-1">
                <div>
                  <strong>{t("admin.contracts.updateModal.from")}:</strong>{" "}
                  <span className="font-mono text-xs">{selectedDependency.address}</span>
                </div>
                <div>
                  <strong>{t("admin.contracts.updateModal.contract")}:</strong>{" "}
                  {selectedDependency.contract}
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleUpdate)} className="space-y-4">
            <FormField
              control={form.control}
              name="setFunction"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.contracts.updateModal.setFunction")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="newAddress"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("admin.contracts.updateModal.newAddress")}</FormLabel>
                  <FormControl>
                    <Input {...field} disabled />
                  </FormControl>
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                {t("common.cancel")}
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating ? t("common.loading") : t("common.confirm")}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
